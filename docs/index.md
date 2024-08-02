# Solidity API

## FundsDistributor

_A contract for distributing ERC20 tokens with upgradeable and pausable functionality._

### PAUSER_ROLE

```solidity
bytes32 PAUSER_ROLE
```

Role for pausing the contract

### UPGRADER_ROLE

```solidity
bytes32 UPGRADER_ROLE
```

Role for upgrading the contract

### ADMIN_ROLE

```solidity
bytes32 ADMIN_ROLE
```

Role for admin functions

### _token

```solidity
address _token
```

### _userNonces

```solidity
mapping(address => uint256) _userNonces
```

### _usedSignatures

```solidity
mapping(bytes32 => bool) _usedSignatures
```

### InvalidSignatureChainId

```solidity
error InvalidSignatureChainId()
```

Thrown when the chain ID in the signature does not match the current chain ID.

### AlreadyConfigured

```solidity
error AlreadyConfigured()
```

Thrown when attempting to configure a token address that is already configured.

### ZeroAddress

```solidity
error ZeroAddress()
```

Thrown when attempting to configure a zero address.

### InvalidNonce

```solidity
error InvalidNonce()
```

Thrown when the nonce is invalid for the reward claim.

### InvalidSignature

```solidity
error InvalidSignature()
```

Thrown when the signature is invalid for the reward claim.

### SignatureAlreadyUsed

```solidity
error SignatureAlreadyUsed()
```

Thrown when the signature has already been used for a reward claim.

### RewardPaid

```solidity
event RewardPaid(address user, uint256 amount)
```

Emitted when a reward is paid to a user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The address of the user. |
| amount | uint256 | The amount of the reward. |

### TokenConfigured

```solidity
event TokenConfigured(address newToken)
```

Emitted when the token address is configured.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newToken | address | The new token address. |

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(address pauser, address upgrader, address admin, address token_) public
```

Initializes the contract with given addresses and token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| pauser | address | The address with the PAUSER_ROLE. |
| upgrader | address | The address with the UPGRADER_ROLE. |
| admin | address | The address with the ADMIN_ROLE. |
| token_ | address | The address of the ERC20 token. |

### pause

```solidity
function pause() external
```

Pauses the contract, preventing certain functions from being executed.

_Can only be called by an address with the PAUSER_ROLE._

### unpause

```solidity
function unpause() external
```

Unpauses the contract, allowing functions to be executed.

_Can only be called by an address with the PAUSER_ROLE._

### configureTokenAddress

```solidity
function configureTokenAddress(address token_) external
```

Configures the token address.

_Can only be called by an address with the ADMIN_ROLE.
Reverts if the new token address is the same as the current one or if it is a zero address._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token_ | address | The new token address. |

### claimReward

```solidity
function claimReward(uint256 amount, uint256 nonce, bytes signature) external
```

Claims a reward for the sender.

_Reverts if the nonce is invalid, the signature is already used, or the signature is invalid._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of the reward. |
| nonce | uint256 | The nonce associated with the reward. |
| signature | bytes | The signature to verify the reward claim. |

### getNonce

```solidity
function getNonce(address user) external view returns (uint256)
```

Returns the nonce for a given user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The address of the user. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The nonce for the user. |

### getSignatureUsedStatus

```solidity
function getSignatureUsedStatus(bytes signature) external view returns (bool)
```

Checks if a signature has been used.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signature | bytes | The signature to check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the signature has been used, false otherwise. |

### token

```solidity
function token() external view returns (address)
```

Returns the token address.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The token address. |

### verifySignature

```solidity
function verifySignature(address user, uint256 amount, uint256 nonce, uint256 chainId, bytes signature) public view returns (bool)
```

Verifies the signature for a reward claim.

_Reverts if the chain ID does not match the current chain ID._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The address of the user. |
| amount | uint256 | The amount of the reward. |
| nonce | uint256 | The nonce associated with the reward. |
| chainId | uint256 | The chain ID. |
| signature | bytes | The signature to verify. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the signature is valid, false otherwise. |

### _authorizeUpgrade

```solidity
function _authorizeUpgrade(address newImplementation) internal
```

Authorizes an upgrade to a new implementation.

_Can only be called by an address with the UPGRADER_ROLE._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newImplementation | address | The address of the new implementation. |

## TestToken

### constructor

```solidity
constructor() public
```

### mint

```solidity
function mint(address to, uint256 amount) public
```

