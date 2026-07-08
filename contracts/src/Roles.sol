// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title Roles
/// @notice Canonical role identifiers shared across Prive contracts. In production the
/// DEFAULT_ADMIN_ROLE on each contract is held by a Gnosis Safe multi-sig (docs/04 §PriveAccessControl).
library Roles {
    bytes32 internal constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 internal constant RETIRER_ROLE = keccak256("RETIRER_ROLE");
    bytes32 internal constant SETTLER_ROLE = keccak256("SETTLER_ROLE");
    bytes32 internal constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 internal constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
}
