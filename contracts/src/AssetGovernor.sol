// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {AssetRegistry} from "./AssetRegistry.sol";

/// @title AssetGovernor
/// @notice Shareholder votes for each asset (renovations, refinancing, sale, change of operator).
///         Voting power is the holder's share balance at the proposal snapshot (ERC20Votes checkpoints), so
///         shares bought after a proposal opens cannot swing it. Execution happens off-chain through the
///         SPV; the operator records the outcome on-chain.
contract AssetGovernor is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Support {
        Against,
        For,
        Abstain
    }

    enum State {
        Active,
        Defeated,
        Succeeded,
        Executed
    }

    struct Proposal {
        address token;
        address proposer;
        string title;
        string descriptionURI;
        uint48 snapshot;
        uint48 deadline;
        uint16 quorumBps;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
    }

    AssetRegistry public immutable registry;
    uint16 public proposalThresholdBps = 100; // 1% of supply to propose
    uint16 public defaultQuorumBps = 2_000; // 20% of supply must vote

    Proposal[] private _proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(
        uint256 indexed id,
        address indexed token,
        address indexed proposer,
        string title,
        uint48 snapshot,
        uint48 deadline
    );
    event VoteCast(uint256 indexed id, address indexed voter, Support support, uint256 weight);
    event ProposalExecuted(uint256 indexed id, string note);

    error NotListedAsset();
    error BelowThreshold(uint256 required);
    error InvalidDuration();
    error VotingClosed();
    error AlreadyVoted();
    error NoVotingPower();
    error NotSucceeded();

    constructor(AssetRegistry registry_, address admin) {
        registry = registry_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    function propose(address token, string calldata title, string calldata descriptionURI, uint48 duration)
        external
        returns (uint256 id)
    {
        if (!registry.isListedToken(token)) revert NotListedAsset();
        if (duration < 1 hours || duration > 60 days) revert InvalidDuration();
        uint48 snapshot = uint48(block.timestamp - 1);
        uint256 supply = IVotes(token).getPastTotalSupply(snapshot);
        uint256 required = (supply * proposalThresholdBps) / 10_000;
        bool isOperator = hasRole(OPERATOR_ROLE, msg.sender);
        if (!isOperator && IVotes(token).getPastVotes(msg.sender, snapshot) < required) {
            revert BelowThreshold(required);
        }

        id = _proposals.length;
        _proposals.push(
            Proposal(
                token,
                msg.sender,
                title,
                descriptionURI,
                snapshot,
                uint48(block.timestamp) + duration,
                defaultQuorumBps,
                0,
                0,
                0,
                false
            )
        );
        emit ProposalCreated(id, token, msg.sender, title, snapshot, uint48(block.timestamp) + duration);
    }

    function castVote(uint256 id, Support support) external returns (uint256 weight) {
        Proposal storage p = _proposals[id];
        if (block.timestamp >= p.deadline) revert VotingClosed();
        if (hasVoted[id][msg.sender]) revert AlreadyVoted();
        weight = IVotes(p.token).getPastVotes(msg.sender, p.snapshot);
        if (weight == 0) revert NoVotingPower();
        hasVoted[id][msg.sender] = true;
        if (support == Support.For) p.forVotes += weight;
        else if (support == Support.Against) p.againstVotes += weight;
        else p.abstainVotes += weight;
        emit VoteCast(id, msg.sender, support, weight);
    }

    function state(uint256 id) public view returns (State) {
        Proposal storage p = _proposals[id];
        if (p.executed) return State.Executed;
        if (block.timestamp < p.deadline) return State.Active;
        uint256 supply = IVotes(p.token).getPastTotalSupply(p.snapshot);
        uint256 turnout = p.forVotes + p.againstVotes + p.abstainVotes;
        bool quorum = turnout * 10_000 >= supply * p.quorumBps;
        return (quorum && p.forVotes > p.againstVotes) ? State.Succeeded : State.Defeated;
    }

    function markExecuted(uint256 id, string calldata note) external onlyRole(OPERATOR_ROLE) {
        if (state(id) != State.Succeeded) revert NotSucceeded();
        _proposals[id].executed = true;
        emit ProposalExecuted(id, note);
    }

    function proposal(uint256 id) external view returns (Proposal memory) {
        return _proposals[id];
    }

    function proposalCount() external view returns (uint256) {
        return _proposals.length;
    }
}
