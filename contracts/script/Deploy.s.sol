// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {KEUR} from "../src/KEUR.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {AssetGovernor} from "../src/AssetGovernor.sol";

/// Deploys the five core contracts to a public test network (for example Base Sepolia).
/// The deployer becomes operator and treasury. Test networks only: kEUR has no value.
///
///   forge script script/Deploy.s.sol --rpc-url $RPC_URL --account <keystore-name> --broadcast
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        address admin = msg.sender;
        KEUR keur = new KEUR(admin);
        IdentityRegistry identity = new IdentityRegistry(admin);
        AssetRegistry registry = new AssetRegistry(identity, admin);
        Marketplace market = new Marketplace(IERC20(address(keur)), registry, admin, 100, admin);
        AssetGovernor governor = new AssetGovernor(registry, admin);
        vm.stopBroadcast();

        console.log("KEUR             ", address(keur));
        console.log("IdentityRegistry ", address(identity));
        console.log("AssetRegistry    ", address(registry));
        console.log("Marketplace      ", address(market));
        console.log("AssetGovernor    ", address(governor));
    }
}
