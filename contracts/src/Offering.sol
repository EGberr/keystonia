// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {AssetToken} from "./AssetToken.sol";
import {IdentityRegistry} from "./IdentityRegistry.sol";

/// @title Offering
/// @notice All-or-nothing primary sale of an asset's shares (crowdfunding model).
///         Investors commit kEUR during the window. If the minimum is reached (or the sale sells out) the
///         issuer receives the proceeds minus the platform fee and investors claim their shares; otherwise
///         every investor can withdraw a full refund. Funds sit in this contract until then.
contract Offering is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    uint256 public constant MAX_FEE_BPS = 500; // 5%

    enum Status {
        Active,
        Succeeded,
        Failed
    }

    AssetToken public immutable token;
    IERC20 public immutable paymentToken;
    IdentityRegistry public immutable identityRegistry;
    address public immutable issuer;
    address public immutable treasury;
    uint256 public immutable pricePerShare; // in payment token units (kEUR, 6 decimals)
    uint256 public immutable sharesForSale;
    uint256 public immutable minShares; // soft cap
    uint256 public immutable maxSharesPerInvestor; // 0 = no limit
    uint64 public immutable startsAt;
    uint64 public immutable endsAt;
    uint16 public immutable feeBps;

    Status public status;
    uint256 public sharesSold;
    uint256 public investorCount;
    mapping(address => uint256) public commitmentOf; // shares
    mapping(address => bool) public settled; // claimed shares or refunded

    event Invested(address indexed investor, uint256 shares, uint256 paid);
    event Finalized(Status status, uint256 sharesSold, uint256 raised, uint256 fee);
    event SharesClaimed(address indexed investor, uint256 shares);
    event Refunded(address indexed investor, uint256 amount);

    error NotActive();
    error OutsideWindow();
    error NotVerified();
    error InvalidAmount();
    error InsufficientSharesLeft(uint256 left);
    error InvestorCapExceeded(uint256 cap);
    error CannotFinalizeYet();
    error NothingToSettle();
    error InvalidConfig();

    struct Config {
        AssetToken token;
        IERC20 paymentToken;
        IdentityRegistry identityRegistry;
        address issuer;
        address treasury;
        uint256 pricePerShare;
        uint256 sharesForSale;
        uint256 minShares;
        uint256 maxSharesPerInvestor;
        uint64 startsAt;
        uint64 endsAt;
        uint16 feeBps;
    }

    constructor(Config memory c, address admin) {
        if (
            c.pricePerShare == 0 || c.sharesForSale == 0 || c.minShares > c.sharesForSale
                || c.endsAt <= c.startsAt || c.feeBps > MAX_FEE_BPS || c.issuer == address(0)
                || c.treasury == address(0)
        ) revert InvalidConfig();
        token = c.token;
        paymentToken = c.paymentToken;
        identityRegistry = c.identityRegistry;
        issuer = c.issuer;
        treasury = c.treasury;
        pricePerShare = c.pricePerShare;
        sharesForSale = c.sharesForSale;
        minShares = c.minShares;
        maxSharesPerInvestor = c.maxSharesPerInvestor;
        startsAt = c.startsAt;
        endsAt = c.endsAt;
        feeBps = c.feeBps;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    function invest(uint256 shares) external nonReentrant {
        if (status != Status.Active) revert NotActive();
        if (block.timestamp < startsAt || block.timestamp >= endsAt) revert OutsideWindow();
        if (!identityRegistry.isVerified(msg.sender)) revert NotVerified();
        if (shares == 0) revert InvalidAmount();
        uint256 left = sharesForSale - sharesSold;
        if (shares > left) revert InsufficientSharesLeft(left);
        uint256 newCommitment = commitmentOf[msg.sender] + shares;
        if (maxSharesPerInvestor != 0 && newCommitment > maxSharesPerInvestor) {
            revert InvestorCapExceeded(maxSharesPerInvestor);
        }

        if (commitmentOf[msg.sender] == 0) investorCount += 1;
        commitmentOf[msg.sender] = newCommitment;
        sharesSold += shares;

        uint256 cost = shares * pricePerShare;
        paymentToken.safeTransferFrom(msg.sender, address(this), cost);
        emit Invested(msg.sender, shares, cost);
    }

    /// @notice Anyone can settle the sale once it sold out, or once the window closed.
    function finalize() external nonReentrant {
        if (status != Status.Active) revert NotActive();
        bool soldOut = sharesSold == sharesForSale;
        if (!soldOut && block.timestamp < endsAt) revert CannotFinalizeYet();

        if (soldOut || sharesSold >= minShares) {
            status = Status.Succeeded;
            uint256 raised = sharesSold * pricePerShare;
            uint256 fee = (raised * feeBps) / 10_000;
            paymentToken.safeTransfer(treasury, fee);
            paymentToken.safeTransfer(issuer, raised - fee);
            emit Finalized(status, sharesSold, raised, fee);
        } else {
            status = Status.Failed;
            emit Finalized(status, sharesSold, 0, 0);
        }
    }

    /// @notice Operator kill switch before settlement (e.g. failed due diligence): everyone is refunded.
    function cancel() external onlyRole(OPERATOR_ROLE) {
        if (status != Status.Active) revert NotActive();
        status = Status.Failed;
        emit Finalized(status, sharesSold, 0, 0);
    }

    function claimShares() external nonReentrant {
        if (status != Status.Succeeded) revert NotActive();
        uint256 shares = commitmentOf[msg.sender];
        if (shares == 0 || settled[msg.sender]) revert NothingToSettle();
        settled[msg.sender] = true;
        token.mint(msg.sender, shares);
        emit SharesClaimed(msg.sender, shares);
    }

    function refund() external nonReentrant {
        if (status != Status.Failed) revert NotActive();
        uint256 shares = commitmentOf[msg.sender];
        if (shares == 0 || settled[msg.sender]) revert NothingToSettle();
        settled[msg.sender] = true;
        uint256 amount = shares * pricePerShare;
        paymentToken.safeTransfer(msg.sender, amount);
        emit Refunded(msg.sender, amount);
    }

    function progressBps() external view returns (uint256) {
        return (sharesSold * 10_000) / sharesForSale;
    }
}
