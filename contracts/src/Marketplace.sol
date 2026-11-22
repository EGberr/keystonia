// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {AssetRegistry} from "./AssetRegistry.sol";

/// @title Marketplace
/// @notice Secondary market for listed asset shares. Sellers post limit sell orders without escrow (they keep
///         earning income until a fill); the marketplace moves shares with `transferFrom`, so every trade goes
///         through the token's compliance checks (buyer KYC, jurisdiction, holder cap).
contract Marketplace is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_FEE_BPS = 300; // 3%

    struct Listing {
        address seller;
        address token;
        uint128 pricePerShare; // payment token units
        uint64 remaining;
        uint64 createdAt;
        bool active;
    }

    IERC20 public immutable paymentToken;
    AssetRegistry public immutable registry;
    address public treasury;
    uint16 public feeBps;

    Listing[] private _listings;
    mapping(address => uint256) public lastPrice; // token => last traded price per share

    event Listed(
        uint256 indexed id, address indexed seller, address indexed token, uint256 shares, uint256 price
    );
    event Cancelled(uint256 indexed id);
    event Trade(
        uint256 indexed id,
        address indexed token,
        address seller,
        address buyer,
        uint256 shares,
        uint256 pricePerShare,
        uint256 fee
    );
    event FeeUpdated(uint16 feeBps, address treasury);

    error NotListedAsset();
    error InvalidAmount();
    error InsufficientBalance();
    error ListingInactive();
    error NotSeller();
    error SelfTrade();
    error FeeTooHigh();

    constructor(
        IERC20 paymentToken_,
        AssetRegistry registry_,
        address treasury_,
        uint16 feeBps_,
        address admin
    ) {
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        paymentToken = paymentToken_;
        registry = registry_;
        treasury = treasury_;
        feeBps = feeBps_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setFee(uint16 feeBps_, address treasury_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        feeBps = feeBps_;
        treasury = treasury_;
        emit FeeUpdated(feeBps_, treasury_);
    }

    function list(address token, uint64 shares, uint128 pricePerShare) external returns (uint256 id) {
        if (!registry.isListedToken(token)) revert NotListedAsset();
        if (shares == 0 || pricePerShare == 0) revert InvalidAmount();
        if (IERC20(token).balanceOf(msg.sender) < shares) revert InsufficientBalance();
        id = _listings.length;
        _listings.push(Listing(msg.sender, token, pricePerShare, shares, uint64(block.timestamp), true));
        emit Listed(id, msg.sender, token, shares, pricePerShare);
    }

    function cancel(uint256 id) external {
        Listing storage l = _listings[id];
        if (l.seller != msg.sender) revert NotSeller();
        if (!l.active) revert ListingInactive();
        l.active = false;
        emit Cancelled(id);
    }

    function buy(uint256 id, uint64 shares) external nonReentrant {
        Listing storage l = _listings[id];
        if (!l.active) revert ListingInactive();
        if (shares == 0 || shares > l.remaining) revert InvalidAmount();
        if (l.seller == msg.sender) revert SelfTrade();

        l.remaining -= shares;
        if (l.remaining == 0) l.active = false;

        uint256 cost = uint256(shares) * l.pricePerShare;
        uint256 fee = (cost * feeBps) / 10_000;
        lastPrice[l.token] = l.pricePerShare;

        paymentToken.safeTransferFrom(msg.sender, l.seller, cost - fee);
        if (fee > 0) paymentToken.safeTransferFrom(msg.sender, treasury, fee);
        // Reverts if the seller no longer holds the shares / revoked approval, or if compliance fails.
        IERC20(l.token).safeTransferFrom(l.seller, msg.sender, shares);

        emit Trade(id, l.token, l.seller, msg.sender, shares, l.pricePerShare, fee);
    }

    function listing(uint256 id) external view returns (Listing memory) {
        return _listings[id];
    }

    function listingCount() external view returns (uint256) {
        return _listings.length;
    }
}
