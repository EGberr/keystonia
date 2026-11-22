// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {BaseTest} from "./Base.t.sol";
import {AssetToken} from "../src/AssetToken.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";

contract AssetTokenTest is BaseTest {
    function test_ZeroDecimalsAndMetadata() public view {
        assertEq(token.decimals(), 0);
        assertEq(token.assetId(), "KST-PAR-001");
        assertEq(token.maxSupply(), 10_000);
        assertEq(token.CLOCK_MODE(), "mode=timestamp");
    }

    function test_MintRequiresVerifiedRecipient() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(AssetToken.NotVerified.selector, mallory));
        token.mint(mallory, 10);
    }

    function test_MintCannotExceedMaxSupply() public {
        _mint(alice, 10_000);
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(AssetToken.MaxSupplyExceeded.selector, 10_000));
        token.mint(alice, 1);
    }

    function test_TransferToUnverifiedReverts() public {
        _mint(alice, 100);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AssetToken.NotVerified.selector, mallory));
        token.transfer(mallory, 10);
    }

    function test_ExpiredKycBlocksTransfers() public {
        _mint(alice, 100);
        vm.warp(block.timestamp + 366 days);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AssetToken.NotVerified.selector, bob));
        token.transfer(bob, 10);
    }

    function test_FrozenWalletCannotSendOrReceive() public {
        _mint(alice, 100);
        vm.prank(admin);
        token.setFrozen(alice, true);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AssetToken.WalletFrozen.selector, alice));
        token.transfer(bob, 10);

        _mint(bob, 10);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(AssetToken.WalletFrozen.selector, alice));
        token.transfer(alice, 1);
    }

    function test_BlockedJurisdiction() public {
        _mint(alice, 100);
        vm.prank(admin);
        token.setCountryBlocked(GB, true);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AssetToken.CountryNotAllowed.selector, bob, GB));
        token.transfer(bob, 1);
    }

    function test_MaxHoldersAndHolderCount() public {
        vm.prank(admin);
        token.setMaxHolders(2);
        _mint(alice, 100);
        _mint(bob, 100);
        assertEq(token.holderCount(), 2);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AssetToken.TooManyHolders.selector, 2));
        token.transfer(carol, 1);
        // Moving a full balance keeps the count constant.
        vm.prank(alice);
        token.transfer(carol, 100);
        assertEq(token.holderCount(), 2);
    }

    function test_ForcedTransferBypassesFreezeButNotKyc() public {
        _mint(alice, 100);
        vm.startPrank(admin);
        token.setFrozen(alice, true);
        token.forcedTransfer(alice, bob, 40);
        assertEq(token.balanceOf(bob), 40);
        vm.expectRevert(abi.encodeWithSelector(AssetToken.NotVerified.selector, mallory));
        token.forcedTransfer(alice, mallory, 1);
        vm.stopPrank();
    }

    function test_OnlyRolesCanAdminister() public {
        vm.startPrank(alice);
        vm.expectRevert();
        token.mint(alice, 1);
        vm.expectRevert();
        token.setFrozen(bob, true);
        vm.expectRevert();
        token.distributeIncome(1, "x");
        vm.stopPrank();
    }

    function test_IncomeIsProRata() public {
        _mint(alice, 7_500);
        _mint(bob, 2_500);
        _distribute(10_000e6);
        assertEq(token.withdrawableIncomeOf(alice), 7_500e6);
        assertEq(token.withdrawableIncomeOf(bob), 2_500e6);

        uint256 before = keur.balanceOf(alice);
        vm.prank(alice);
        token.claimIncome();
        assertEq(keur.balanceOf(alice) - before, 7_500e6);
        assertEq(token.withdrawableIncomeOf(alice), 0);
    }

    function test_IncomeFollowsOwnershipOverTime() public {
        _mint(alice, 1_000);
        _distribute(1_000e6); // alice earns it all
        vm.prank(alice);
        token.transfer(bob, 500);
        _distribute(1_000e6); // split 50/50
        assertEq(token.withdrawableIncomeOf(alice), 1_500e6);
        assertEq(token.withdrawableIncomeOf(bob), 500e6);
        assertEq(token.totalIncomeDistributed(), 2_000e6);
    }

    function test_DistributeRevertsWithoutSupply() public {
        vm.startPrank(admin);
        keur.approve(address(token), 1e6);
        vm.expectRevert(AssetToken.NothingToDistribute.selector);
        token.distributeIncome(1e6, "2026-01");
        vm.stopPrank();
    }

    function test_VotesAreAutoDelegated() public {
        _mint(alice, 300);
        assertEq(token.getVotes(alice), 300);
        vm.prank(alice);
        token.transfer(bob, 100);
        assertEq(token.getVotes(alice), 200);
        assertEq(token.getVotes(bob), 100);
    }

    function testFuzz_IncomeConservation(
        uint96 a,
        uint96 b,
        uint96 c,
        uint64 income1,
        uint64 income2,
        uint8 moved
    ) public {
        uint256 sa = bound(a, 1, 3_000);
        uint256 sb = bound(b, 1, 3_000);
        uint256 sc = bound(c, 1, 3_000);
        uint256 i1 = bound(income1, 1e6, 1_000_000e6);
        uint256 i2 = bound(income2, 1e6, 1_000_000e6);
        _mint(alice, sa);
        _mint(bob, sb);
        _mint(carol, sc);
        _distribute(i1);
        uint256 move = bound(moved, 0, sa);
        vm.prank(alice);
        token.transfer(carol, move);
        _distribute(i2);

        uint256 owed = token.withdrawableIncomeOf(alice) + token.withdrawableIncomeOf(bob)
            + token.withdrawableIncomeOf(carol);
        assertLe(owed, i1 + i2, "never over-allocates");
        assertGe(owed + 6, i1 + i2, "rounding dust is at most a few units");
        assertLe(owed, keur.balanceOf(address(token)), "always solvent");
    }

    function _distribute(uint256 amount) internal {
        vm.startPrank(admin);
        keur.approve(address(token), amount);
        token.distributeIncome(amount, "period");
        vm.stopPrank();
    }

    function test_IdentityRegistryValidation() public {
        vm.startPrank(admin);
        vm.expectRevert(IdentityRegistry.InvalidIdentity.selector);
        ids.registerIdentity(address(0), FR, IdentityRegistry.Tier.Retail, uint64(block.timestamp + 1));
        vm.expectRevert(IdentityRegistry.InvalidIdentity.selector);
        ids.registerIdentity(mallory, FR, IdentityRegistry.Tier.None, uint64(block.timestamp + 1));
        ids.revokeIdentity(alice);
        vm.stopPrank();
        assertFalse(ids.isVerified(alice));
    }
}
