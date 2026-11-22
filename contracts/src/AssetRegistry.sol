// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IdentityRegistry} from "./IdentityRegistry.sol";

/// @title AssetRegistry
/// @notice Catalogue of tokenized assets and the issuer onboarding pipeline.
///         An owner (KYC-verified) submits a listing request with a metadata URI (photos, documents,
///         valuation). After off-chain due diligence the operator deploys the asset's token and offering and
///         registers them here, linking the request; or rejects it with a reason.
contract AssetRegistry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Category {
        Residential,
        Hospitality,
        Commercial,
        Resort,
        Land
    }

    enum RequestStatus {
        Pending,
        Approved,
        Rejected
    }

    struct Asset {
        address token;
        address offering;
        Category category;
        string city;
        string metadataURI;
        uint256 valuation; // in payment token units (kEUR, 6 decimals)
        uint64 listedAt;
    }

    struct ListingRequest {
        address owner;
        Category category;
        string city;
        string metadataURI;
        uint256 askedValuation;
        RequestStatus status;
        string reviewNote;
        uint64 submittedAt;
    }

    IdentityRegistry public immutable identityRegistry;
    Asset[] private _assets;
    ListingRequest[] private _requests;
    mapping(address => bool) public isListedToken;
    mapping(address => uint256) public assetIndexOf; // token => index + 1

    event ListingRequested(
        uint256 indexed requestId, address indexed owner, Category category, string city, string metadataURI
    );
    event ListingReviewed(uint256 indexed requestId, RequestStatus status, string note);
    event AssetListed(
        uint256 indexed assetIndex,
        address indexed token,
        address offering,
        Category category,
        string city,
        string metadataURI,
        uint256 valuation,
        uint256 requestId
    );
    event ValuationUpdated(uint256 indexed assetIndex, uint256 valuation);

    error NotVerified();
    error UnknownRequest();
    error AlreadyReviewed();
    error AlreadyListed();

    uint256 public constant NO_REQUEST = type(uint256).max;

    constructor(IdentityRegistry identityRegistry_, address admin) {
        identityRegistry = identityRegistry_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    function submitListing(
        Category category,
        string calldata city,
        string calldata metadataURI,
        uint256 askedValuation
    ) external returns (uint256 requestId) {
        if (!identityRegistry.isVerified(msg.sender)) revert NotVerified();
        requestId = _requests.length;
        _requests.push(
            ListingRequest(
                msg.sender,
                category,
                city,
                metadataURI,
                askedValuation,
                RequestStatus.Pending,
                "",
                uint64(block.timestamp)
            )
        );
        emit ListingRequested(requestId, msg.sender, category, city, metadataURI);
    }

    function rejectRequest(uint256 requestId, string calldata note) external onlyRole(OPERATOR_ROLE) {
        ListingRequest storage r = _request(requestId);
        if (r.status != RequestStatus.Pending) revert AlreadyReviewed();
        r.status = RequestStatus.Rejected;
        r.reviewNote = note;
        emit ListingReviewed(requestId, RequestStatus.Rejected, note);
    }

    /// @notice Registers a deployed asset. `requestId` links it to an owner request (or NO_REQUEST).
    function registerAsset(
        address token,
        address offering,
        Category category,
        string calldata city,
        string calldata metadataURI,
        uint256 valuation,
        uint256 requestId
    ) external onlyRole(OPERATOR_ROLE) returns (uint256 index) {
        if (isListedToken[token]) revert AlreadyListed();
        if (requestId != NO_REQUEST) {
            ListingRequest storage r = _request(requestId);
            if (r.status != RequestStatus.Pending) revert AlreadyReviewed();
            r.status = RequestStatus.Approved;
            r.reviewNote = "approved";
            emit ListingReviewed(requestId, RequestStatus.Approved, "approved");
        }
        index = _assets.length;
        _assets.push(Asset(token, offering, category, city, metadataURI, valuation, uint64(block.timestamp)));
        isListedToken[token] = true;
        assetIndexOf[token] = index + 1;
        emit AssetListed(index, token, offering, category, city, metadataURI, valuation, requestId);
    }

    function updateValuation(uint256 index, uint256 valuation) external onlyRole(OPERATOR_ROLE) {
        _assets[index].valuation = valuation;
        emit ValuationUpdated(index, valuation);
    }

    function asset(uint256 index) external view returns (Asset memory) {
        return _assets[index];
    }

    function assetCount() external view returns (uint256) {
        return _assets.length;
    }

    function request(uint256 requestId) external view returns (ListingRequest memory) {
        return _requests[requestId];
    }

    function requestCount() external view returns (uint256) {
        return _requests.length;
    }

    function _request(uint256 requestId) private view returns (ListingRequest storage) {
        if (requestId >= _requests.length) revert UnknownRequest();
        return _requests[requestId];
    }
}
