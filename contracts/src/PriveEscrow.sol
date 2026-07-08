// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {Roles} from "./Roles.sol";

/// @title PriveEscrow
/// @notice Batched, Merkle-proven trade settlement. The off-chain matching engine commits a
/// batch's Merkle root on-chain (finality + tamper-evidence); individual settlements are then
/// realised — with proof — when value crosses the custody boundary. (docs/04 §PriveEscrow)
contract PriveEscrow is AccessControl, Pausable, ReentrancyGuard, ERC1155Holder {
    struct Settlement {
        uint256 tradeId;
        address buyer;
        address seller;
        uint256 creditTokenId;
        uint256 creditAmount;
        address quoteToken;
        uint256 quoteAmount;
    }

    IERC1155 public immutable credits;

    mapping(bytes32 => bool) public committedRoot; // merkleRoot => committed
    mapping(uint256 => bool) private _settled; // tradeId => realised

    event BatchSettled(bytes32 indexed merkleRoot, uint256 tradeCount, uint256 timestamp);
    event SettlementApplied(uint256 indexed tradeId, bytes32 indexed merkleRoot);

    constructor(address admin, address creditRegistry) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(Roles.SETTLER_ROLE, admin);
        _grantRole(Roles.PAUSER_ROLE, admin);
        credits = IERC1155(creditRegistry);
    }

    /// @notice Commit a batch root. SETTLER_ROLE (the blockchain gateway). Off-chain balances
    /// are already updated; this provides on-chain finality + a tamper-evident anchor.
    function settleBatch(bytes32 merkleRoot, uint256 tradeCount) external onlyRole(Roles.SETTLER_ROLE) whenNotPaused {
        require(merkleRoot != bytes32(0), "empty root");
        committedRoot[merkleRoot] = true;
        emit BatchSettled(merkleRoot, tradeCount, block.timestamp);
    }

    /// @notice Realise a single settlement against a committed root: atomic swap of credits
    /// (escrow -> buyer) and quote (escrow -> seller). Verifies the Merkle proof; each tradeId
    /// can settle at most once.
    function applySettlement(Settlement calldata s, bytes32 merkleRoot, bytes32[] calldata proof)
        external
        nonReentrant
        whenNotPaused
    {
        require(committedRoot[merkleRoot], "root not committed");
        require(!_settled[s.tradeId], "already settled");
        bytes32 leaf = _leaf(s);
        require(MerkleProof.verify(proof, merkleRoot, leaf), "invalid proof");

        _settled[s.tradeId] = true;

        if (s.creditAmount > 0) {
            credits.safeTransferFrom(address(this), s.buyer, s.creditTokenId, s.creditAmount, "");
        }
        if (s.quoteAmount > 0 && s.quoteToken != address(0)) {
            require(IERC20(s.quoteToken).transfer(s.seller, s.quoteAmount), "quote transfer failed");
        }

        emit SettlementApplied(s.tradeId, merkleRoot);
    }

    function isSettled(uint256 tradeId) external view returns (bool) {
        return _settled[tradeId];
    }

    /// @notice Canonical leaf hashing for a settlement (double-hash to resist second preimage).
    function leafOf(Settlement calldata s) external pure returns (bytes32) {
        return _leaf(s);
    }

    function _leaf(Settlement calldata s) internal pure returns (bytes32) {
        return keccak256(
            bytes.concat(
                keccak256(
                    abi.encode(
                        s.tradeId, s.buyer, s.seller, s.creditTokenId, s.creditAmount, s.quoteToken, s.quoteAmount
                    )
                )
            )
        );
    }

    function pause() external onlyRole(Roles.PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(Roles.PAUSER_ROLE) {
        _unpause();
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl, ERC1155Holder) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
