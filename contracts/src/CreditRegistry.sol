// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Roles} from "./Roles.sol";

/// @title CreditRegistry
/// @notice Tokenised carbon credits as ERC-1155 — one token id per project-vintage batch.
/// Enforces the core integrity rule: a batch can only be minted after its legacy registry
/// serials were retired at source (`registryRetired == true`), so 1 token == 1 real tonne.
/// (docs/04 §CreditRegistry)
contract CreditRegistry is ERC1155, AccessControl, Pausable {
    struct BatchInfo {
        uint256 projectId;
        uint16 vintageYear;
        bytes32 standard; // keccak256("verra_vcs") etc.
        bytes32 metadataHash; // sha256 of the IPFS metadata JSON
        string registrySerialRange; // e.g. "VCS-1234-0001..0500"
        bool registryRetired; // legacy serials retired at source (anti double-sell)
        bool exists;
        uint256 totalMinted;
        uint256 totalRetired;
    }

    mapping(uint256 => BatchInfo) private _batches;
    mapping(uint256 => string) private _tokenCid; // ipfs cid per token id

    event BatchRegistered(uint256 indexed tokenId, uint256 indexed projectId, uint16 vintageYear, bytes32 metadataHash);
    event CreditsMinted(uint256 indexed tokenId, address indexed to, uint256 amount);
    event CreditsRetired(uint256 indexed tokenId, address indexed from, uint256 amount);
    event MetadataAnchored(uint256 indexed tokenId, string ipfsCid, bytes32 metadataHash);
    event RegistryRetiredSet(uint256 indexed tokenId, bool value);

    constructor(address admin) ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(Roles.MINTER_ROLE, admin);
        _grantRole(Roles.PAUSER_ROLE, admin);
    }

    // --------------------------------------------------------------- registration

    /// @notice Register a batch's metadata BEFORE minting. MINTER_ROLE (multi-sig in prod).
    function registerBatch(uint256 tokenId, BatchInfo calldata info, string calldata ipfsCid)
        external
        onlyRole(Roles.MINTER_ROLE)
        returns (uint256)
    {
        require(!_batches[tokenId].exists, "batch exists");
        BatchInfo memory b = info;
        b.exists = true;
        b.totalMinted = 0;
        b.totalRetired = 0;
        _batches[tokenId] = b;
        _tokenCid[tokenId] = ipfsCid;
        emit BatchRegistered(tokenId, info.projectId, info.vintageYear, info.metadataHash);
        emit MetadataAnchored(tokenId, ipfsCid, info.metadataHash);
        return tokenId;
    }

    /// @notice Attest that the batch's legacy registry serials were retired at source.
    /// In Phase 2 this is driven by the registry-API oracle (ORACLE_ROLE); at MVP, admin.
    function setRegistryRetired(uint256 tokenId, bool value) external onlyRole(Roles.MINTER_ROLE) {
        require(_batches[tokenId].exists, "unknown batch");
        _batches[tokenId].registryRetired = value;
        emit RegistryRetiredSet(tokenId, value);
    }

    // --------------------------------------------------------------- minting

    /// @notice Mint credits for an already-registered, registry-retired batch.
    /// Reverts unless registryRetired — the anti-double-counting guarantee.
    function mint(uint256 tokenId, address to, uint256 amount) external onlyRole(Roles.MINTER_ROLE) whenNotPaused {
        BatchInfo storage b = _batches[tokenId];
        require(b.exists, "unknown batch");
        require(b.registryRetired, "registry not retired: cannot mint");
        require(amount > 0, "zero amount");
        b.totalMinted += amount;
        _mint(to, tokenId, amount, "");
        emit CreditsMinted(tokenId, to, amount);
    }

    // --------------------------------------------------------------- retirement hook

    /// @notice Burn credits on retirement. Only the RetirementVault (RETIRER_ROLE) may call.
    /// Updates totalRetired so circulating == totalMinted - totalRetired stays provable.
    function burnForRetirement(address from, uint256 tokenId, uint256 amount)
        external
        onlyRole(Roles.RETIRER_ROLE)
        whenNotPaused
    {
        BatchInfo storage b = _batches[tokenId];
        require(b.exists, "unknown batch");
        b.totalRetired += amount;
        _burn(from, tokenId, amount);
        emit CreditsRetired(tokenId, from, amount);
    }

    // --------------------------------------------------------------- views

    function batchInfo(uint256 tokenId) external view returns (BatchInfo memory) {
        return _batches[tokenId];
    }

    /// @return circulating supply of a batch (minted minus retired).
    function circulating(uint256 tokenId) external view returns (uint256) {
        BatchInfo storage b = _batches[tokenId];
        return b.totalMinted - b.totalRetired;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked("ipfs://", _tokenCid[tokenId]));
    }

    // --------------------------------------------------------------- admin

    function pause() external onlyRole(Roles.PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(Roles.PAUSER_ROLE) {
        _unpause();
    }

    // guard transfers while paused
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override
        whenNotPaused
    {
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
