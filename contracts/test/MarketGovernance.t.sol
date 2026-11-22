// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {BaseTest} from "./Base.t.sol";
import {AssetToken} from "../src/AssetToken.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {AssetGovernor} from "../src/AssetGovernor.sol";

contract MarketGovernanceTest is BaseTest {
    function setUp() public override {
        super.setUp();
        vm.prank(admin);
        registry.registerAsset(
            address(token),
            address(0),
            AssetRegistry.Category.Residential,
            "Paris",
            "ipfs://x",
            500_000e6,
            type(uint256).max
        );
        _mint(alice, 6_000);
        _mint(bob, 3_000);
    }

    // ── marketplace ────────────────────────────────────────────────────────
    function _list(address seller, uint64 shares, uint128 price) internal returns (uint256 id) {
        vm.startPrank(seller);
        token.approve(address(market), shares);
        id = market.list(address(token), shares, price);
        vm.stopPrank();
    }

    function test_ListAndPartialFill() public {
        uint256 id = _list(alice, 100, 55e6);
        vm.startPrank(bob);
        keur.approve(address(market), type(uint256).max);
        uint256 aliceBefore = keur.balanceOf(alice);
        market.buy(id, 40);
        vm.stopPrank();

        assertEq(token.balanceOf(bob), 3_040);
        uint256 cost = 40 * 55e6;
        assertEq(keur.balanceOf(alice) - aliceBefore, cost - cost / 100);
        assertEq(keur.balanceOf(treasury), cost / 100);
        assertEq(market.listing(id).remaining, 60);
        assertEq(market.lastPrice(address(token)), 55e6);
    }

    function test_BuyerMustBeVerified() public {
        uint256 id = _list(alice, 10, 50e6);
        vm.prank(admin);
        keur.mint(mallory, 1_000e6);
        vm.startPrank(mallory);
        keur.approve(address(market), type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(AssetToken.NotVerified.selector, mallory));
        market.buy(id, 1);
        vm.stopPrank();
    }

    function test_StaleListingRevertsIfSellerMovedShares() public {
        uint256 id = _list(alice, 100, 50e6);
        vm.prank(alice);
        token.transfer(carol, 6_000);
        vm.startPrank(bob);
        keur.approve(address(market), type(uint256).max);
        vm.expectRevert();
        market.buy(id, 1);
        vm.stopPrank();
    }

    function test_CancelAndGuards() public {
        uint256 id = _list(alice, 10, 50e6);
        vm.prank(bob);
        vm.expectRevert(Marketplace.NotSeller.selector);
        market.cancel(id);
        vm.prank(alice);
        vm.expectRevert(Marketplace.SelfTrade.selector);
        market.buy(id, 1);
        vm.prank(alice);
        market.cancel(id);
        vm.prank(bob);
        vm.expectRevert(Marketplace.ListingInactive.selector);
        market.buy(id, 1);
    }

    function test_CannotListUnknownTokenOrMoreThanHeld() public {
        vm.startPrank(admin);
        AssetToken other = _newToken("KST-LON-001", 1_000);
        vm.stopPrank();
        vm.prank(alice);
        vm.expectRevert(Marketplace.NotListedAsset.selector);
        market.list(address(other), 1, 1);
        vm.prank(carol);
        vm.expectRevert(Marketplace.InsufficientBalance.selector);
        market.list(address(token), 1, 1);
    }

    // ── governance ─────────────────────────────────────────────────────────
    function _propose(address who) internal returns (uint256 id) {
        vm.warp(block.timestamp + 1);
        vm.prank(who);
        id = governor.propose(address(token), "Renovate the kitchen", "ipfs://proposal", 7 days);
    }

    function test_ProposalSucceedsWithQuorumAndMajority() public {
        uint256 id = _propose(alice);
        vm.prank(alice);
        governor.castVote(id, AssetGovernor.Support.For);
        vm.prank(bob);
        governor.castVote(id, AssetGovernor.Support.Against);
        assertEq(uint8(governor.state(id)), uint8(AssetGovernor.State.Active));
        vm.warp(block.timestamp + 8 days);
        assertEq(uint8(governor.state(id)), uint8(AssetGovernor.State.Succeeded));
        vm.prank(admin);
        governor.markExecuted(id, "works ordered");
        assertEq(uint8(governor.state(id)), uint8(AssetGovernor.State.Executed));
    }

    function test_DefeatedWithoutQuorum() public {
        _mint(carol, 1_000);
        uint256 id = _propose(carol); // carol holds 10%: above the 1% threshold
        vm.prank(carol);
        governor.castVote(id, AssetGovernor.Support.For); // 10% turnout < 20% quorum
        vm.warp(block.timestamp + 8 days);
        assertEq(uint8(governor.state(id)), uint8(AssetGovernor.State.Defeated));
        vm.prank(admin);
        vm.expectRevert(AssetGovernor.NotSucceeded.selector);
        governor.markExecuted(id, "");
    }

    function test_SharesBoughtAfterSnapshotDoNotVote() public {
        uint256 id = _propose(alice);
        vm.prank(alice);
        token.transfer(carol, 2_000); // after snapshot
        vm.prank(carol);
        vm.expectRevert(AssetGovernor.NoVotingPower.selector);
        governor.castVote(id, AssetGovernor.Support.For);
        vm.prank(alice);
        uint256 weight = governor.castVote(id, AssetGovernor.Support.For);
        assertEq(weight, 6_000, "alice votes with her snapshot balance");
    }

    function test_ProposalThresholdAndDoubleVote() public {
        _mint(carol, 10); // 0.1% < 1%
        vm.warp(block.timestamp + 1);
        vm.prank(carol);
        vm.expectRevert();
        governor.propose(address(token), "x", "y", 7 days);
        uint256 id = _propose(bob);
        vm.startPrank(bob);
        governor.castVote(id, AssetGovernor.Support.Abstain);
        vm.expectRevert(AssetGovernor.AlreadyVoted.selector);
        governor.castVote(id, AssetGovernor.Support.For);
        vm.stopPrank();
    }

    // ── registry onboarding ───────────────────────────────────────────────
    function test_ListingRequestLifecycle() public {
        vm.prank(mallory);
        vm.expectRevert(AssetRegistry.NotVerified.selector);
        registry.submitListing(AssetRegistry.Category.Hospitality, "Marrakech", "ipfs://riad", 900_000e6);

        vm.prank(issuer);
        uint256 r1 =
            registry.submitListing(AssetRegistry.Category.Hospitality, "Marrakech", "ipfs://riad", 900_000e6);
        vm.prank(issuer);
        uint256 r2 =
            registry.submitListing(AssetRegistry.Category.Commercial, "London", "ipfs://shop", 2_000_000e6);

        vm.startPrank(admin);
        registry.rejectRequest(r2, "missing lease agreements");
        AssetToken riad = _newToken("KST-RAK-001", 20_000);
        registry.registerAsset(
            address(riad),
            address(0),
            AssetRegistry.Category.Hospitality,
            "Marrakech",
            "ipfs://riad",
            850_000e6,
            r1
        );
        vm.expectRevert(AssetRegistry.AlreadyReviewed.selector);
        registry.rejectRequest(r1, "late");
        vm.stopPrank();

        assertEq(uint8(registry.request(r1).status), uint8(AssetRegistry.RequestStatus.Approved));
        assertEq(uint8(registry.request(r2).status), uint8(AssetRegistry.RequestStatus.Rejected));
        assertEq(registry.assetCount(), 2);
        assertTrue(registry.isListedToken(address(riad)));
    }
}
