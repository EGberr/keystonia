// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {BaseTest} from "./Base.t.sol";
import {KEUR} from "../src/KEUR.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";

contract PlatformTest is BaseTest {
    function test_FaucetCooldown() public {
        vm.prank(mallory);
        keur.faucet();
        assertEq(keur.balanceOf(mallory), keur.FAUCET_AMOUNT());
        vm.prank(mallory);
        vm.expectRevert(abi.encodeWithSelector(KEUR.FaucetCooldown.selector, block.timestamp + 1 days));
        keur.faucet();
        vm.warp(block.timestamp + 1 days);
        vm.prank(mallory);
        keur.faucet();
        assertEq(keur.balanceOf(mallory), 2 * keur.FAUCET_AMOUNT());
        assertEq(keur.decimals(), 6);
    }

    function test_OnlyOwnerMintsKeur() public {
        vm.prank(alice);
        vm.expectRevert();
        keur.mint(alice, 1);
    }

    function test_MarketplaceFeeBounds() public {
        vm.startPrank(admin);
        vm.expectRevert(Marketplace.FeeTooHigh.selector);
        market.setFee(301, treasury);
        market.setFee(50, alice);
        vm.stopPrank();
        assertEq(market.feeBps(), 50);
        assertEq(market.treasury(), alice);
    }

    function test_SystemAccountsAreVerified() public {
        address escrow = makeAddr("escrow");
        assertFalse(ids.isVerified(escrow));
        vm.prank(admin);
        ids.setSystemAccount(escrow, true);
        assertTrue(ids.isVerified(escrow));
        assertEq(ids.countryOf(alice), FR);
        assertEq(uint8(ids.identityOf(bob).tier), 1);
    }

    function test_RegistryValuationAndGuards() public {
        vm.startPrank(admin);
        registry.registerAsset(
            address(token),
            address(0),
            AssetRegistry.Category.Land,
            "Paris",
            "ipfs://x",
            1e6,
            type(uint256).max
        );
        vm.expectRevert(AssetRegistry.AlreadyListed.selector);
        registry.registerAsset(
            address(token),
            address(0),
            AssetRegistry.Category.Land,
            "Paris",
            "ipfs://x",
            1e6,
            type(uint256).max
        );
        registry.updateValuation(0, 2e6);
        vm.expectRevert(AssetRegistry.UnknownRequest.selector);
        registry.rejectRequest(42, "nope");
        vm.stopPrank();
        assertEq(registry.asset(0).valuation, 2e6);
        assertEq(registry.assetIndexOf(address(token)), 1);
        assertEq(registry.requestCount(), 0);
    }
}
