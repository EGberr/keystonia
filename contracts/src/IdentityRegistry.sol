// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title IdentityRegistry
/// @notice On-chain KYC allowlist, modelled on the ERC-3643 (T-REX) identity registry. Identity checks happen
///         off-chain; KYC agents record the outcome here: country, investor tier and an expiry date.
///         Security tokens consult this registry on every transfer.
contract IdentityRegistry is AccessControl {
    bytes32 public constant KYC_AGENT_ROLE = keccak256("KYC_AGENT_ROLE");

    enum Tier {
        None,
        Retail,
        Professional
    }

    struct Identity {
        uint16 country; // ISO 3166-1 numeric (250 = FR, 826 = GB, 504 = MA, ...)
        Tier tier;
        uint64 expiresAt;
    }

    mapping(address => Identity) private _identities;
    /// @notice Platform contracts (offerings, marketplace escrow) allowed to hold security tokens.
    mapping(address => bool) public isSystemAccount;

    event IdentityRegistered(address indexed wallet, uint16 country, Tier tier, uint64 expiresAt);
    event IdentityRevoked(address indexed wallet);
    event SystemAccountSet(address indexed account, bool allowed);

    error InvalidIdentity();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(KYC_AGENT_ROLE, admin);
    }

    function registerIdentity(address wallet, uint16 country, Tier tier, uint64 expiresAt)
        external
        onlyRole(KYC_AGENT_ROLE)
    {
        if (wallet == address(0) || tier == Tier.None || expiresAt <= block.timestamp) {
            revert InvalidIdentity();
        }
        _identities[wallet] = Identity(country, tier, expiresAt);
        emit IdentityRegistered(wallet, country, tier, expiresAt);
    }

    function revokeIdentity(address wallet) external onlyRole(KYC_AGENT_ROLE) {
        delete _identities[wallet];
        emit IdentityRevoked(wallet);
    }

    function setSystemAccount(address account, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isSystemAccount[account] = allowed;
        emit SystemAccountSet(account, allowed);
    }

    function isVerified(address wallet) public view returns (bool) {
        if (isSystemAccount[wallet]) return true;
        Identity memory id = _identities[wallet];
        return id.tier != Tier.None && id.expiresAt > block.timestamp;
    }

    function identityOf(address wallet) external view returns (Identity memory) {
        return _identities[wallet];
    }

    function countryOf(address wallet) external view returns (uint16) {
        return _identities[wallet].country;
    }
}
