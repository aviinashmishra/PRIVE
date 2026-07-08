// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Roles} from "./Roles.sol";

interface ICreditBurner {
    function burnForRetirement(address from, uint256 tokenId, uint256 amount) external;
}

/// @title RetirementVault
/// @notice Permanently retires (burns) carbon credits and mints a non-transferable
/// Retirement Certificate ERC-721 — the on-chain proof a company embeds in ESG reports.
/// (docs/04 §RetirementVault)
contract RetirementVault is ERC721, AccessControl, ReentrancyGuard {
    ICreditBurner public immutable registry;

    struct Certificate {
        uint256 creditTokenId;
        uint256 amount;
        address beneficiary;
        string beneficiaryName;
        uint64 retiredAt;
    }

    uint256 private _nextId = 1;
    mapping(uint256 => Certificate) private _certs;
    mapping(uint256 => string) private _cids;

    event CreditsRetired(
        uint256 indexed creditTokenId,
        address indexed beneficiary,
        uint256 amount,
        uint256 indexed certificateId
    );

    constructor(address admin, address creditRegistry) ERC721("Prive Retirement Certificate", "PRVCERT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(Roles.RETIRER_ROLE, admin);
        registry = ICreditBurner(creditRegistry);
    }

    /// @notice Burn `amount` of a credit batch from `from` and mint a certificate NFT to `from`.
    /// Caller must hold RETIRER_ROLE (the platform gateway). The vault must hold RETIRER_ROLE on
    /// the CreditRegistry so the burn succeeds.
    function retire(
        address from,
        uint256 creditTokenId,
        uint256 amount,
        string calldata beneficiaryName,
        string calldata certIpfsCid
    ) external onlyRole(Roles.RETIRER_ROLE) nonReentrant returns (uint256 certificateId) {
        require(amount > 0, "zero amount");
        registry.burnForRetirement(from, creditTokenId, amount);

        certificateId = _nextId++;
        _certs[certificateId] = Certificate({
            creditTokenId: creditTokenId,
            amount: amount,
            beneficiary: from,
            beneficiaryName: beneficiaryName,
            retiredAt: uint64(block.timestamp)
        });
        _cids[certificateId] = certIpfsCid;
        _safeMint(from, certificateId);

        emit CreditsRetired(creditTokenId, from, amount, certificateId);
    }

    function certificate(uint256 certificateId) external view returns (Certificate memory) {
        return _certs[certificateId];
    }

    function totalCertificates() external view returns (uint256) {
        return _nextId - 1;
    }

    function tokenURI(uint256 certificateId) public view override returns (string memory) {
        _requireOwned(certificateId);
        return string(abi.encodePacked("ipfs://", _cids[certificateId]));
    }

    // ------------------------------------------------ non-transferable (soulbound)

    /// @dev Allow mint (from == 0) and burn (to == 0); block all wallet-to-wallet transfers.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "certificate is non-transferable");
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
