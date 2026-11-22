// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IdentityRegistry} from "./IdentityRegistry.sol";

/// @title AssetToken
/// @notice A permissioned security token representing fractional shares of one real-world asset (held in a
///         dedicated SPV in a real deployment). Inspired by ERC-3643:
///           - every holder must be KYC-verified in the IdentityRegistry,
///           - per-asset compliance rules (blocked jurisdictions, maximum number of holders),
///           - agent controls (freeze, forced transfer for lost-wallet recovery),
///         plus two platform features:
///           - pull-based income distribution (rent, hotel revenue) proportional to holdings,
///           - checkpointed voting power (ERC20Votes, timestamp clock) for asset governance.
///         Shares are indivisible (0 decimals).
contract AssetToken is ERC20, ERC20Votes, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    uint256 private constant MAGNITUDE = 2 ** 128;

    IdentityRegistry public immutable identityRegistry;
    IERC20 public immutable incomeToken;
    uint256 public immutable maxSupply;
    string public assetId;

    // ── compliance ─────────────────────────────────────────────────────────
    uint256 public maxHolders; // 0 = unlimited
    uint256 public holderCount;
    mapping(uint16 => bool) public blockedCountry;
    mapping(address => bool) public isFrozen;
    bool private _forcing;

    // ── income ─────────────────────────────────────────────────────────────
    uint256 public magnifiedIncomePerShare;
    uint256 public totalIncomeDistributed;
    mapping(address => int256) private _magnifiedCorrections;
    mapping(address => uint256) public withdrawnIncome;

    event IncomeDistributed(address indexed by, uint256 amount, string period);
    event IncomeClaimed(address indexed holder, uint256 amount);
    event FrozenSet(address indexed wallet, bool frozen);
    event CountryBlocked(uint16 indexed country, bool blocked);
    event MaxHoldersSet(uint256 maxHolders);
    event ForcedTransfer(address indexed from, address indexed to, uint256 amount);

    error NotVerified(address wallet);
    error WalletFrozen(address wallet);
    error CountryNotAllowed(address wallet, uint16 country);
    error TooManyHolders(uint256 maxHolders);
    error MaxSupplyExceeded(uint256 maxSupply);
    error NothingToDistribute();

    constructor(
        string memory name_,
        string memory symbol_,
        string memory assetId_,
        uint256 maxSupply_,
        IdentityRegistry registry_,
        IERC20 incomeToken_,
        address admin
    ) ERC20(name_, symbol_) EIP712(name_, "1") {
        assetId = assetId_;
        maxSupply = maxSupply_;
        identityRegistry = registry_;
        incomeToken = incomeToken_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AGENT_ROLE, admin);
        _grantRole(DISTRIBUTOR_ROLE, admin);
    }

    function decimals() public pure override returns (uint8) {
        return 0;
    }

    // ── clock: governance snapshots use timestamps ─────────────────────────
    function clock() public view override returns (uint48) {
        return SafeCast.toUint48(block.timestamp);
    }

    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }

    // ── issuance ───────────────────────────────────────────────────────────
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (totalSupply() + amount > maxSupply) revert MaxSupplyExceeded(maxSupply);
        _mint(to, amount);
    }

    // ── agent controls ─────────────────────────────────────────────────────
    function setFrozen(address wallet, bool frozen) external onlyRole(AGENT_ROLE) {
        isFrozen[wallet] = frozen;
        emit FrozenSet(wallet, frozen);
    }

    function setCountryBlocked(uint16 country, bool blocked) external onlyRole(AGENT_ROLE) {
        blockedCountry[country] = blocked;
        emit CountryBlocked(country, blocked);
    }

    function setMaxHolders(uint256 maxHolders_) external onlyRole(AGENT_ROLE) {
        maxHolders = maxHolders_;
        emit MaxHoldersSet(maxHolders_);
    }

    /// @notice Recovery path (lost keys, court order). The recipient must still pass compliance.
    function forcedTransfer(address from, address to, uint256 amount) external onlyRole(AGENT_ROLE) {
        _forcing = true;
        _transfer(from, to, amount);
        _forcing = false;
        emit ForcedTransfer(from, to, amount);
    }

    // ── income ─────────────────────────────────────────────────────────────
    /// @notice Pulls `amount` of the income token from the caller and allocates it pro rata to holders.
    function distributeIncome(uint256 amount, string calldata period) external onlyRole(DISTRIBUTOR_ROLE) {
        uint256 supply = totalSupply();
        if (amount == 0 || supply == 0) revert NothingToDistribute();
        incomeToken.safeTransferFrom(msg.sender, address(this), amount);
        magnifiedIncomePerShare += (amount * MAGNITUDE) / supply;
        totalIncomeDistributed += amount;
        emit IncomeDistributed(msg.sender, amount, period);
    }

    function accumulativeIncomeOf(address holder) public view returns (uint256) {
        int256 magnified =
            SafeCast.toInt256(magnifiedIncomePerShare * balanceOf(holder)) + _magnifiedCorrections[holder];
        return SafeCast.toUint256(magnified) / MAGNITUDE;
    }

    function withdrawableIncomeOf(address holder) public view returns (uint256) {
        return accumulativeIncomeOf(holder) - withdrawnIncome[holder];
    }

    function claimIncome() external returns (uint256 amount) {
        amount = withdrawableIncomeOf(msg.sender);
        if (amount > 0) {
            withdrawnIncome[msg.sender] += amount;
            incomeToken.safeTransfer(msg.sender, amount);
            emit IncomeClaimed(msg.sender, amount);
        }
    }

    // ── transfer hook: compliance, holder count, income accounting, votes ──
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        if (to != address(0)) {
            if (!identityRegistry.isVerified(to)) revert NotVerified(to);
            if (isFrozen[to]) revert WalletFrozen(to);
            uint16 country = identityRegistry.countryOf(to);
            if (blockedCountry[country]) revert CountryNotAllowed(to, country);
        }
        if (from != address(0) && !_forcing && isFrozen[from]) revert WalletFrozen(from);

        bool newHolder = to != address(0) && to != from && balanceOf(to) == 0 && value > 0;
        super._update(from, to, value);

        if (newHolder) holderCount += 1;
        if (from != address(0) && from != to && value > 0 && balanceOf(from) == 0) holderCount -= 1;
        if (maxHolders != 0 && holderCount > maxHolders) revert TooManyHolders(maxHolders);

        int256 magCorrection = SafeCast.toInt256(magnifiedIncomePerShare * value);
        if (from != address(0)) _magnifiedCorrections[from] += magCorrection;
        if (to != address(0)) _magnifiedCorrections[to] -= magCorrection;

        // Holders vote with their own balance by default, no extra transaction needed.
        if (to != address(0) && delegates(to) == address(0)) _delegate(to, to);
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
