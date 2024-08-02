# FundsDistributor

This project includes the implementation and deployment of an ERC20 token (TestToken) and a FundsDistributor contract.
The project also provides scripts for deployments, generating and verifying signatures, querying events, and obtaining user nonces.

### Smart Contracts
TestToken
A simple ERC20 token with an initial supply of 1,000,000 tokens and a minting function.

### FundsDistributor
A contract that verifies signatures from a trusted server and distributes rewards accordingly.

### Setup
1. Install dependencies:
```bash
npm install
```
2. Configure environment variables in `.env` file (see `.env.example`)

3. Compile the contracts:

```bash
npx hardhat compile
```
4. Run tests:
```bash
npx hardhat test
npx hardhat coverage
```