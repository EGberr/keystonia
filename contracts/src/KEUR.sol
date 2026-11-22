// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title KEUR — Keystonia test euro
/// @notice Settlement token for the Keystonia demo network. It has NO monetary value and only exists on
///         local / test chains. A rate-limited faucet lets demo users fund their wallets.
contract KEUR is ERC20, Ownable {
    uint256 public constant FAUCET_AMOUNT = 10_000e6; // €10,000 per claim
    uint256 public constant FAUCET_COOLDOWN = 1 days;

    mapping(address => uint256) public lastFaucetClaim;

    error FaucetCooldown(uint256 availableAt);

    constructor(address owner_) ERC20("Keystonia Test Euro", "kEUR") Ownable(owner_) {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Operator mint (seeding demo balances, simulating tenants' rent inflows).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Self-service test funds, once a day per wallet.
    function faucet() external {
        uint256 next = lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN;
        if (lastFaucetClaim[msg.sender] != 0 && block.timestamp < next) revert FaucetCooldown(next);
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
