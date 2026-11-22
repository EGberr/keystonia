// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BaseTest} from "./Base.t.sol";
import {Offering} from "../src/Offering.sol";

contract OfferingTest is BaseTest {
    Offering internal offering;
    uint256 internal constant PRICE = 50e6;

    function setUp() public override {
        super.setUp();
        offering = _newOffering(4_000, 2_000, 0);
    }

    function _newOffering(uint256 forSale, uint256 minShares, uint256 cap) internal returns (Offering o) {
        Offering.Config memory c = Offering.Config({
            token: token,
            paymentToken: IERC20(address(keur)),
            identityRegistry: ids,
            issuer: issuer,
            treasury: treasury,
            pricePerShare: PRICE,
            sharesForSale: forSale,
            minShares: minShares,
            maxSharesPerInvestor: cap,
            startsAt: uint64(block.timestamp),
            endsAt: uint64(block.timestamp + 30 days),
            feeBps: 200
        });
        o = new Offering(c, admin);
        vm.startPrank(admin);
        token.grantRole(token.MINTER_ROLE(), address(o));
        vm.stopPrank();
    }

    function _invest(address who, uint256 shares) internal {
        vm.startPrank(who);
        keur.approve(address(offering), shares * PRICE);
        offering.invest(shares);
        vm.stopPrank();
    }

    function test_SuccessfulSellOut() public {
        _invest(alice, 3_000);
        _invest(bob, 1_000);
        assertEq(offering.sharesSold(), 4_000);
        assertEq(offering.investorCount(), 2);
        assertEq(offering.progressBps(), 10_000);

        offering.finalize(); // sold out: no need to wait
        assertEq(uint8(offering.status()), uint8(Offering.Status.Succeeded));
        uint256 raised = 4_000 * PRICE;
        assertEq(keur.balanceOf(treasury), raised * 200 / 10_000);
        assertEq(keur.balanceOf(issuer), raised - raised * 200 / 10_000);

        vm.prank(alice);
        offering.claimShares();
        assertEq(token.balanceOf(alice), 3_000);
        vm.prank(alice);
        vm.expectRevert(Offering.NothingToSettle.selector);
        offering.claimShares();
    }

    function test_SoftCapReachedAfterDeadline() public {
        _invest(alice, 2_500);
        vm.expectRevert(Offering.CannotFinalizeYet.selector);
        offering.finalize();
        vm.warp(block.timestamp + 31 days);
        offering.finalize();
        assertEq(uint8(offering.status()), uint8(Offering.Status.Succeeded));
    }

    function test_FailedSaleRefundsEveryone() public {
        uint256 before = keur.balanceOf(alice);
        _invest(alice, 500);
        vm.warp(block.timestamp + 31 days);
        offering.finalize();
        assertEq(uint8(offering.status()), uint8(Offering.Status.Failed));
        vm.prank(alice);
        offering.refund();
        assertEq(keur.balanceOf(alice), before);
        vm.prank(alice);
        vm.expectRevert(Offering.NothingToSettle.selector);
        offering.refund();
    }

    function test_OperatorCancelRefunds() public {
        _invest(bob, 100);
        vm.prank(admin);
        offering.cancel();
        vm.prank(bob);
        offering.refund();
        assertEq(keur.balanceOf(address(offering)), 0);
    }

    function test_RejectsUnverifiedAndOutOfWindow() public {
        vm.prank(mallory);
        vm.expectRevert(Offering.NotVerified.selector);
        offering.invest(1);
        vm.warp(block.timestamp + 31 days);
        vm.prank(alice);
        vm.expectRevert(Offering.OutsideWindow.selector);
        offering.invest(1);
    }

    function test_CannotOversubscribe() public {
        _invest(alice, 3_900);
        vm.startPrank(bob);
        keur.approve(address(offering), 200 * PRICE);
        vm.expectRevert(abi.encodeWithSelector(Offering.InsufficientSharesLeft.selector, 100));
        offering.invest(200);
        vm.stopPrank();
    }

    function test_InvestorCap() public {
        offering = _newOffering(4_000, 1_000, 250);
        _invest(alice, 200);
        vm.startPrank(alice);
        keur.approve(address(offering), 100 * PRICE);
        vm.expectRevert(abi.encodeWithSelector(Offering.InvestorCapExceeded.selector, 250));
        offering.invest(100);
        vm.stopPrank();
    }

    function test_InvalidConfigReverts() public {
        Offering.Config memory c = Offering.Config({
            token: token,
            paymentToken: IERC20(address(keur)),
            identityRegistry: ids,
            issuer: issuer,
            treasury: treasury,
            pricePerShare: PRICE,
            sharesForSale: 100,
            minShares: 200,
            maxSharesPerInvestor: 0,
            startsAt: uint64(block.timestamp),
            endsAt: uint64(block.timestamp + 1 days),
            feeBps: 200
        });
        vm.expectRevert(Offering.InvalidConfig.selector);
        new Offering(c, admin);
    }

    function testFuzz_FundsAreConserved(uint16 a, uint16 b, bool reachDeadlineOnly) public {
        uint256 sa = bound(a, 1, 2_000);
        uint256 sb = bound(b, 1, 2_000);
        _invest(alice, sa);
        _invest(bob, sb);
        if (reachDeadlineOnly || sa + sb < 4_000) vm.warp(block.timestamp + 31 days);
        offering.finalize();
        if (offering.status() == Offering.Status.Succeeded) {
            assertEq(keur.balanceOf(issuer) + keur.balanceOf(treasury), (sa + sb) * PRICE);
            assertEq(keur.balanceOf(address(offering)), 0);
        } else {
            vm.prank(alice);
            offering.refund();
            vm.prank(bob);
            offering.refund();
            assertEq(keur.balanceOf(address(offering)), 0);
        }
    }
}
