// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {Roles} from "./Roles.sol";

/// @title MiningRewards
/// @notice Gas-abstracted mining grants. Off-chain points convert to fractional credits; the
/// gateway (ORACLE_ROLE) accrues netted grants here, then settles them in batches to users'
/// real ERC-1155 balances from a pre-funded platform liquidity batch. (docs/04 §MiningRewards)
contract MiningRewards is AccessControl, ReentrancyGuard, ERC1155Holder {
    IERC1155 public immutable credits;

    mapping(address => mapping(uint256 => uint256)) public accrued; // user => tokenId => claimable
    uint256 public totalAccrued;
    uint256 public totalSettled;

    uint256 public constant MAX_BATCH = 100;

    event RewardAccrued(address indexed user, uint256 indexed creditTokenId, uint256 amount);
    event RewardSettled(address indexed user, uint256 indexed creditTokenId, uint256 amount);

    constructor(address admin, address creditRegistry) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(Roles.ORACLE_ROLE, admin);
        credits = IERC1155(creditRegistry);
    }

    /// @notice Record a netted grant. ORACLE_ROLE (gateway). Off-chain is authoritative; this
    /// anchors the totals for transparency and lets users settle to real balances.
    function accrue(address user, uint256 creditTokenId, uint256 amount) external onlyRole(Roles.ORACLE_ROLE) {
        require(user != address(0) && amount > 0, "bad input");
        accrued[user][creditTokenId] += amount;
        totalAccrued += amount;
        emit RewardAccrued(user, creditTokenId, amount);
    }

    /// @notice Move accrued rewards into users' real ERC-1155 balances (batched, from the
    /// contract's pre-funded liquidity holdings). Bounded loop.
    function settle(address[] calldata users, uint256 creditTokenId) external onlyRole(Roles.ORACLE_ROLE) nonReentrant {
        require(users.length <= MAX_BATCH, "batch too large");
        for (uint256 i = 0; i < users.length; i++) {
            address u = users[i];
            uint256 amt = accrued[u][creditTokenId];
            if (amt == 0) continue;
            accrued[u][creditTokenId] = 0;
            totalSettled += amt;
            credits.safeTransferFrom(address(this), u, creditTokenId, amt, "");
            emit RewardSettled(u, creditTokenId, amt);
        }
    }

    function claimable(address user, uint256 creditTokenId) external view returns (uint256) {
        return accrued[user][creditTokenId];
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl, ERC1155Holder) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
