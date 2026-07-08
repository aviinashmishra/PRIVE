// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Roles} from "./Roles.sol";

/// @title AuditAnchor
/// @notice Periodically stores Merkle roots of the admin audit log and the off-chain order-book
/// state, so an operator cannot silently rewrite history. (docs/04 §AuditAnchor)
contract AuditAnchor is AccessControl {
    // kind => epoch => root
    mapping(bytes32 => mapping(uint256 => bytes32)) private _roots;
    mapping(bytes32 => uint256) public latestEpoch;

    event RootAnchored(bytes32 indexed kind, bytes32 root, uint256 indexed epoch);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(Roles.SETTLER_ROLE, admin);
    }

    /// @notice Anchor a root for a given kind + epoch. SETTLER_ROLE (ops/gateway).
    /// kind = keccak256("audit_log") | keccak256("orderbook").
    function anchor(bytes32 kind, bytes32 root, uint256 epoch) external onlyRole(Roles.SETTLER_ROLE) {
        require(root != bytes32(0), "empty root");
        require(_roots[kind][epoch] == bytes32(0), "epoch already anchored");
        _roots[kind][epoch] = root;
        if (epoch > latestEpoch[kind]) latestEpoch[kind] = epoch;
        emit RootAnchored(kind, root, epoch);
    }

    function rootAt(bytes32 kind, uint256 epoch) external view returns (bytes32) {
        return _roots[kind][epoch];
    }
}
