// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title FundsDistributor
/// @dev A contract for distributing ERC20 tokens with upgradeable and pausable functionality.
contract FundsDistributor is Initializable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // The address of the ERC20 reward token.
    address internal _token;

    // The mapping of the user to current nonce.
    mapping(address => uint256) internal _userNonces;

    // The mapping of the user signatures.
    mapping(bytes32 => bool) internal _usedSignatures;

    /**
    * @notice Thrown when the chain ID in the signature does not match the current chain ID.
     */
    error InvalidSignatureChainId();

    /**
     * @notice Thrown when attempting to configure a token address that is already configured.
     */
    error AlreadyConfigured();

    /**
     * @notice Thrown when attempting to configure a zero address.
     */
    error ZeroAddress();

    /**
     * @notice Thrown when the nonce is invalid for the reward claim.
     */
    error InvalidNonce();

    /**
     * @notice Thrown when the signature is invalid for the reward claim.
     */
    error InvalidSignature();

    /**
     * @notice Thrown when the signature has already been used for a reward claim.
     */
    error SignatureAlreadyUsed();

    /**
     * @notice Emitted when a reward is paid to a user.
     * @param user The address of the user.
     * @param amount The amount of the reward.
     */
    event RewardPaid(address indexed user, uint256 amount);

    /**
     * @notice Emitted when the token address is configured.
     * @param newToken The new token address.
     */
    event TokenConfigured(address indexed newToken);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with given addresses and token.
     * @param pauser The address with the PAUSER_ROLE.
     * @param upgrader The address with the UPGRADER_ROLE.
     * @param admin The address with the ADMIN_ROLE.
     * @param token_ The address of the ERC20 token.
     */
    function initialize(address pauser, address upgrader, address admin, address token_) initializer public {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(PAUSER_ROLE, pauser);
        _grantRole(UPGRADER_ROLE, upgrader);
        _grantRole(ADMIN_ROLE, admin);

        _token = token_;
        emit TokenConfigured(token_);
    }

    /**
     * @notice Pauses the contract, preventing certain functions from being executed.
     * @dev Can only be called by an address with the PAUSER_ROLE.
     */
    function pause() external onlyRole(PAUSER_ROLE)  {
        _pause();
    }

    /**
     * @notice Unpauses the contract, allowing functions to be executed.
     * @dev Can only be called by an address with the PAUSER_ROLE.
     */
    function unpause() external onlyRole(PAUSER_ROLE)  {
        _unpause();
    }

    /**
     * @notice Configures the token address.
     * @param token_ The new token address.
     * @dev Can only be called by an address with the ADMIN_ROLE.
     * Reverts if the new token address is the same as the current one or if it is a zero address.
     */
    function configureTokenAddress(address token_) external onlyRole(ADMIN_ROLE) {
        if (token_ == _token) {
            revert AlreadyConfigured();
        }
        if (token_ == address(0)) {
            revert ZeroAddress();
        }
        _token = token_;
        emit TokenConfigured(token_);
    }

    /**
     * @notice Claims a reward for the sender.
     * @param amount The amount of the reward.
     * @param nonce The nonce associated with the reward.
     * @param signature The signature to verify the reward claim.
     * @dev Reverts if the nonce is invalid, the signature is already used, or the signature is invalid.
     */
    function claimReward(uint256 amount, uint256 nonce, bytes memory signature) external whenNotPaused {
        if (nonce != _userNonces[msg.sender]) {
            revert InvalidNonce();
        }
        bytes32 signatureHash = keccak256(signature);
        if (_usedSignatures[signatureHash]) {
            revert SignatureAlreadyUsed();
        }

        if (!verifySignature(msg.sender, amount, nonce, block.chainid, signature)) {
            revert InvalidSignature();
        }

        _usedSignatures[signatureHash] = true;
        _userNonces[msg.sender] += 1;

        IERC20(_token).safeTransfer(msg.sender, amount);
        emit RewardPaid(msg.sender, amount);
    }

    /**
     * @notice Returns the nonce for a given user.
     * @param user The address of the user.
     * @return The nonce for the user.
     */
    function getNonce(address user) external view returns (uint256) {
        return _userNonces[user];
    }

    /**
     * @notice Checks if a signature has been used.
     * @param signature The signature to check.
     * @return True if the signature has been used, false otherwise.
     */
    function getSignatureUsedStatus(bytes memory signature) external view returns (bool) {
        return _usedSignatures[keccak256(signature)];
    }

    /**
     * @notice Returns the token address.
     * @return The token address.
     */
    function token() external view returns (address) {
        return _token;
    }

    /**
     * @notice Verifies the signature for a reward claim.
     * @param user The address of the user.
     * @param amount The amount of the reward.
     * @param nonce The nonce associated with the reward.
     * @param chainId The chain ID.
     * @param signature The signature to verify.
     * @return True if the signature is valid, false otherwise.
     * @dev Reverts if the chain ID does not match the current chain ID.
     */
    function verifySignature(address user, uint256 amount, uint256 nonce, uint256 chainId, bytes memory signature) public view returns (bool) {
        if (chainId != block.chainid) {
            revert InvalidSignatureChainId();
        }
        bytes32 messageHash = keccak256(abi.encodePacked(user, amount, nonce, chainId));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address signer = ECDSA.recover(ethSignedMessageHash, signature);

        return signer == user;
    }

    /**
     * @notice Authorizes an upgrade to a new implementation.
     * @param newImplementation The address of the new implementation.
     * @dev Can only be called by an address with the UPGRADER_ROLE.
     */
    function _authorizeUpgrade(address newImplementation) internal onlyRole(UPGRADER_ROLE) override {}
}
