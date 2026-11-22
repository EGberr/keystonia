// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {KEUR} from "../src/KEUR.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {AssetToken} from "../src/AssetToken.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {Offering} from "../src/Offering.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {AssetGovernor} from "../src/AssetGovernor.sol";

abstract contract BaseTest is Test {
    uint16 internal constant FR = 250;
    uint16 internal constant GB = 826;
    uint16 internal constant MA = 504;
    uint16 internal constant US = 840;

    address internal admin = makeAddr("admin");
    address internal treasury = makeAddr("treasury");
    address internal issuer = makeAddr("issuer");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal mallory = makeAddr("mallory"); // never verified

    KEUR internal keur;
    IdentityRegistry internal ids;
    AssetRegistry internal registry;
    Marketplace internal market;
    AssetGovernor internal governor;
    AssetToken internal token;

    function setUp() public virtual {
        vm.warp(1_800_000_000);
        keur = new KEUR(admin);
        ids = new IdentityRegistry(admin);
        registry = new AssetRegistry(ids, admin);
        market = new Marketplace(IERC20(address(keur)), registry, treasury, 100, admin); // 1%
        governor = new AssetGovernor(registry, admin);

        vm.startPrank(admin);
        uint64 exp = uint64(block.timestamp + 365 days);
        ids.registerIdentity(issuer, FR, IdentityRegistry.Tier.Professional, exp);
        ids.registerIdentity(alice, FR, IdentityRegistry.Tier.Retail, exp);
        ids.registerIdentity(bob, GB, IdentityRegistry.Tier.Retail, exp);
        ids.registerIdentity(carol, MA, IdentityRegistry.Tier.Retail, exp);
        token = _newToken("KST-PAR-001", 10_000);
        keur.mint(alice, 1_000_000e6);
        keur.mint(bob, 1_000_000e6);
        keur.mint(carol, 1_000_000e6);
        keur.mint(admin, 10_000_000e6);
        vm.stopPrank();
    }

    function _newToken(string memory id, uint256 supply) internal returns (AssetToken t) {
        t = new AssetToken(string.concat("Keystonia ", id), id, id, supply, ids, IERC20(address(keur)), admin);
        t.grantRole(t.MINTER_ROLE(), admin);
    }

    function _mint(address to, uint256 amount) internal {
        vm.prank(admin);
        token.mint(to, amount);
    }
}
