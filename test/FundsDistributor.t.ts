import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { Contract, ContractFactory } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
  TransactionReceipt,
  TransactionResponse,
} from "@ethersproject/abstract-provider";

describe("Contract 'FundsDistributor'", async () => {
  const PAUSER_ROLE = ethers.id("PAUSER_ROLE");
  const UPGRADER_ROLE = ethers.id("UPGRADER_ROLE");
  const ADMIN_ROLE = ethers.id("ADMIN_ROLE");

  const REVERT_ERROR_INVALID_INITIALIZATION = "InvalidInitialization";
  const REVERT_ERROR_ACCESS_CONTROL_UNAUTHORIZED =
    "AccessControlUnauthorizedAccount";
  const REVERT_ERROR_ENFORCED_PAUSE = "EnforcedPause";
  const REVERT_ERROR_EXPECTED_PAUSE = "ExpectedPause";
  const REVERT_ERROR_ALREADY_CONFIGURED = "AlreadyConfigured";
  const REVERT_ERROR_ZERO_ADDRESS = "ZeroAddress";
  const REVERT_ERROR_INVALID_NONCE = "InvalidNonce";
  const REVERT_ERROR_INVALID_SIGNATURE = "InvalidSignature";
  const REVERT_ERROR_SIGNATURE_ALREADY_USED = "SignatureAlreadyUsed";
  const REVERT_ERROR_ERC20_BALANCE_EXCEEDED = "ERC20InsufficientBalance";
  const REVERT_ERROR_INVALID_CHAIN_ID = "InvalidSignatureChainId";

  const EVENT_NAME_TOKEN_ADDRESS_CONFIGURED = "TokenConfigured";
  const EVENT_NAME_REWARD_PAID = "RewardPaid";

  const SUPPLY_AMOUNT = 1_000_000;
  const REWARD_AMOUNT = 100;
  const HARDHAT_CHAIN_ID = 31337;

  let tokenFactory: ContractFactory;
  let distributorFactory: ContractFactory;
  let deployer: HardhatEthersSigner;
  let pauser: HardhatEthersSigner;
  let upgrader: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;
  let random: HardhatEthersSigner;

  before(async () => {
    [deployer, pauser, upgrader, user, attacker, random] =
      await ethers.getSigners();
    tokenFactory = await ethers.getContractFactory("TestToken");
    distributorFactory = await ethers.getContractFactory("FundsDistributor");
  });

  async function getTx(
    txResponsePromise: Promise<TransactionResponse>,
  ): Promise<TransactionReceipt> {
    const txReceipt = await txResponsePromise;
    return txReceipt.wait();
  }

  async function createSignature(
    signer: HardhatEthersSigner,
    amount: number,
    nonce: number,
    chainId: number,
  ): Promise<string> {
    // user, amount, nonce, chainId
    const message = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "uint256"],
      [signer.address, amount, nonce, chainId],
    );
    const messageHashBin = ethers.getBytes(message);
    return await user.signMessage(messageHashBin);
  }

  async function deployContracts(): Promise<{
    token: Contract;
    distributor: Contract;
  }> {
    let token: Contract = (await tokenFactory.deploy()) as Contract;
    await token.waitForDeployment;
    token = token.connect(deployer) as Contract;
    const tokenAddress = await token.getAddress();

    let distributor: Contract = await upgrades.deployProxy(distributorFactory, [
      pauser.address,
      upgrader.address,
      deployer.address, // admin role
      tokenAddress,
    ]);
    await distributor.waitForDeployment;
    distributor = distributor.connect(deployer) as Contract;

    return {
      token,
      distributor,
    };
  }

  describe("Functions 'initialize()' and '_authorizeUpgrade'", async () => {
    it("Initializer configures contract as expected", async () => {
      const { token, distributor } = await loadFixture(deployContracts);

      expect(await distributor.hasRole(PAUSER_ROLE, pauser.address)).to.eq(
        true,
      );
      expect(await distributor.hasRole(UPGRADER_ROLE, upgrader.address)).to.eq(
        true,
      );
      expect(await distributor.hasRole(ADMIN_ROLE, deployer.address)).to.eq(
        true,
      );
      expect(await distributor.token()).to.eq(await token.getAddress());
    });

    it("Initializer is reverted if called second time", async () => {
      const { distributor } = await loadFixture(deployContracts);

      await expect(
        distributor.initialize(
          pauser.address,
          upgrader.address,
          deployer.address,
          random.address,
        ),
      ).to.be.revertedWithCustomError(
        distributor,
        REVERT_ERROR_INVALID_INITIALIZATION,
      );
    });

    it("'upgradeToAndCall()' executes as expected", async () => {
      const { distributor } = await loadFixture(deployContracts);
      const distributorConnectedToUpgrader = distributor.connect(
        upgrader,
      ) as Contract;

      const contractAddress = await distributorConnectedToUpgrader.getAddress();
      const oldImplementationAddress =
        await upgrades.erc1967.getImplementationAddress(contractAddress);
      const newImplementation = await distributorFactory.deploy();
      await newImplementation.waitForDeployment();
      const expectedNewImplementationAddress =
        await newImplementation.getAddress();

      await getTx(
        distributorConnectedToUpgrader.upgradeToAndCall(
          expectedNewImplementationAddress,
          "0x",
        ),
      );

      const actualNewImplementationAddress =
        await upgrades.erc1967.getImplementationAddress(contractAddress);
      expect(actualNewImplementationAddress).to.eq(
        expectedNewImplementationAddress,
      );
      expect(actualNewImplementationAddress).not.to.eq(
        oldImplementationAddress,
      );
    });

    it("'upgradeToAndCall()' is reverted if the caller is not the upgrader", async () => {
      const { distributor } = await loadFixture(deployContracts);
      const distributorConnectedToAttacker = distributor.connect(
        attacker,
      ) as Contract;

      await expect(
        distributorConnectedToAttacker.upgradeToAndCall(random.address, "0x"),
      )
        .to.be.revertedWithCustomError(
          distributor,
          REVERT_ERROR_ACCESS_CONTROL_UNAUTHORIZED,
        )
        .withArgs(attacker.address, UPGRADER_ROLE);
    });
  });

  describe("Function 'pause()'", async () => {
    it("Executes as expected and pauses contract", async () => {
      const { distributor } = await loadFixture(deployContracts);
      const distributorConnectedToPauser = distributor.connect(
        pauser,
      ) as Contract;

      expect(await distributor.paused()).to.eq(false);
      await distributorConnectedToPauser.pause();
      expect(await distributor.paused()).to.eq(true);
    });

    it("Is reverted if the caller does not have pauser role", async () => {
      const { distributor } = await loadFixture(deployContracts);
      const distributorConnectedToAttacker = distributor.connect(
        attacker,
      ) as Contract;

      await expect(distributorConnectedToAttacker.pause())
        .to.be.revertedWithCustomError(
          distributor,
          REVERT_ERROR_ACCESS_CONTROL_UNAUTHORIZED,
        )
        .withArgs(attacker.address, PAUSER_ROLE);
    });

    it("Is reverted if the contract is paused", async () => {
      const { distributor } = await loadFixture(deployContracts);
      const distributorConnectedToPauser = distributor.connect(
        pauser,
      ) as Contract;

      await distributorConnectedToPauser.pause();
      expect(await distributor.paused()).to.eq(true);

      await expect(
        distributorConnectedToPauser.pause(),
      ).to.be.revertedWithCustomError(distributor, REVERT_ERROR_ENFORCED_PAUSE);
    });
  });

  describe("Function 'unpause()'", async () => {
    it("Executes as expected and unpauses contract", async () => {
      const { distributor } = await loadFixture(deployContracts);
      const distributorConnectedToPauser = distributor.connect(
        pauser,
      ) as Contract;

      await distributorConnectedToPauser.pause();
      expect(await distributor.paused()).to.eq(true);

      await distributorConnectedToPauser.unpause();
      expect(await distributor.paused()).to.eq(false);
    });

    it("Is reverted if the caller does not have pauser role", async () => {
      const { distributor } = await loadFixture(deployContracts);
      await (distributor.connect(pauser) as Contract).pause();
      const distributorConnectedToAttacker = distributor.connect(
        attacker,
      ) as Contract;

      await expect(distributorConnectedToAttacker.unpause())
        .to.be.revertedWithCustomError(
          distributor,
          REVERT_ERROR_ACCESS_CONTROL_UNAUTHORIZED,
        )
        .withArgs(attacker.address, PAUSER_ROLE);
    });

    it("Is reverted if the contract is not paused", async () => {
      const { distributor } = await loadFixture(deployContracts);
      let distributorConnectedToPauser = distributor.connect(
        pauser,
      ) as Contract;

      expect(await distributor.paused()).to.eq(false);

      await expect(
        distributorConnectedToPauser.unpause(),
      ).to.be.revertedWithCustomError(distributor, REVERT_ERROR_EXPECTED_PAUSE);
    });
  });

  describe("Function 'configureTokenAddress'", async () => {
    it("Executes as expected and changes the token address", async () => {
      const { distributor } = await loadFixture(deployContracts);

      await expect(distributor.configureTokenAddress(random.address))
        .to.emit(distributor, EVENT_NAME_TOKEN_ADDRESS_CONFIGURED)
        .withArgs(random.address);

      expect(await distributor.token()).to.eq(random.address);
    });

    it("Is reverted if the caller does not have admin role", async () => {
      const { distributor } = await loadFixture(deployContracts);
      const distributorConnectedToAttacker = distributor.connect(
        attacker,
      ) as Contract;

      await expect(
        distributorConnectedToAttacker.configureTokenAddress(attacker.address),
      )
        .to.be.revertedWithCustomError(
          distributor,
          REVERT_ERROR_ACCESS_CONTROL_UNAUTHORIZED,
        )
        .withArgs(attacker.address, ADMIN_ROLE);
    });

    it("Is reverted if the same token address is already configured", async () => {
      const { distributor } = await loadFixture(deployContracts);
      await distributor.configureTokenAddress(random.address);

      await expect(
        distributor.configureTokenAddress(random.address),
      ).to.be.revertedWithCustomError(
        distributor,
        REVERT_ERROR_ALREADY_CONFIGURED,
      );
    });

    it("Is reverted if the new token address is zero", async () => {
      const { distributor } = await loadFixture(deployContracts);

      await expect(
        distributor.configureTokenAddress(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(distributor, REVERT_ERROR_ZERO_ADDRESS);
    });
  });

  describe("Function 'claimReward()'", async () => {
    it("Executes as expected", async () => {
      const { token, distributor } = await loadFixture(deployContracts);
      const distributorConnectedToUser = distributor.connect(user) as Contract;
      await token.transfer(await distributor.getAddress(), SUPPLY_AMOUNT);
      const startingNonce = 0;

      const signature = await createSignature(
        user,
        REWARD_AMOUNT,
        startingNonce,
        HARDHAT_CHAIN_ID,
      );

      // user, amount, nonce, chainId, signature
      expect(
        await distributor.verifySignature(
          user.address,
          REWARD_AMOUNT,
          startingNonce,
          HARDHAT_CHAIN_ID,
          signature,
        ),
      ).to.eq(true);

      const tx = distributorConnectedToUser.claimReward(
        REWARD_AMOUNT,
        startingNonce,
        signature,
      );

      // check event and balance update
      await expect(tx)
        .to.emit(distributor, EVENT_NAME_REWARD_PAID)
        .withArgs(user.address, REWARD_AMOUNT);
      await expect(tx).to.changeTokenBalances(
        token,
        [distributor, user],
        [-REWARD_AMOUNT, +REWARD_AMOUNT],
      );

      // check new stored data
      expect(await distributor.getSignatureUsedStatus(signature)).to.eq(true);
      expect(await distributor.getNonce(user.address)).to.eq(startingNonce + 1);
    });

    it("Is reverted if nonce is invalid", async () => {
      const { distributor } = await loadFixture(deployContracts);
      const signature = await createSignature(
        user,
        REWARD_AMOUNT,
        322,
        HARDHAT_CHAIN_ID,
      );

      await expect(
        distributor.claimReward(REWARD_AMOUNT, 322, signature),
      ).to.be.revertedWithCustomError(distributor, REVERT_ERROR_INVALID_NONCE);
    });

    it("Is reverted if the caller is not the signer", async () => {
      const { distributor } = await loadFixture(deployContracts);
      const signature = await createSignature(
        user,
        REWARD_AMOUNT,
        0,
        HARDHAT_CHAIN_ID,
      );
      const distributorConnectedToAttacker = distributor.connect(
        attacker,
      ) as Contract;

      await expect(
        distributorConnectedToAttacker.claimReward(REWARD_AMOUNT, 0, signature),
      ).to.be.revertedWithCustomError(
        distributor,
        REVERT_ERROR_INVALID_SIGNATURE,
      );
    });

    it("Is reverted if the amount is not the signed one", async () => {
      const { distributor } = await loadFixture(deployContracts);
      const signature = await createSignature(
        deployer,
        REWARD_AMOUNT,
        0,
        HARDHAT_CHAIN_ID,
      );

      await expect(
        distributor.claimReward(REWARD_AMOUNT + 1, 0, signature),
      ).to.be.revertedWithCustomError(
        distributor,
        REVERT_ERROR_INVALID_SIGNATURE,
      );
    });

    it("Is reverted if signature already used", async () => {
      const { token, distributor } = await loadFixture(deployContracts);
      const distributorConnectedToUser = distributor.connect(user) as Contract;
      const signature = await createSignature(
        user,
        REWARD_AMOUNT,
        0,
        HARDHAT_CHAIN_ID,
      );
      await token.transfer(await distributor.getAddress(), SUPPLY_AMOUNT);

      await distributorConnectedToUser.claimReward(REWARD_AMOUNT, 0, signature);

      await expect(
        distributorConnectedToUser.claimReward(REWARD_AMOUNT, 1, signature),
      ).to.be.revertedWithCustomError(
        distributor,
        REVERT_ERROR_SIGNATURE_ALREADY_USED,
      );
    });

    it("Is reverted if the contract is paused", async () => {
      const { distributor } = await loadFixture(deployContracts);
      const distributorConnectedToUser = distributor.connect(user) as Contract;
      const distributorConnectedToPauser = distributor.connect(
        pauser,
      ) as Contract;
      const signature = await createSignature(
        user,
        REWARD_AMOUNT,
        0,
        HARDHAT_CHAIN_ID,
      );

      await distributorConnectedToPauser.pause();

      await expect(
        distributorConnectedToUser.claimReward(REWARD_AMOUNT, 0, signature),
      ).to.be.revertedWithCustomError(distributor, REVERT_ERROR_ENFORCED_PAUSE);
    });

    it("Is reverted if contract does not have enough funds", async () => {
      const { token, distributor } = await loadFixture(deployContracts);
      const distributorConnectedToUser = distributor.connect(user) as Contract;
      const signature = await createSignature(
        user,
        REWARD_AMOUNT,
        0,
        HARDHAT_CHAIN_ID,
      );

      await expect(
        distributorConnectedToUser.claimReward(REWARD_AMOUNT, 0, signature),
      )
        .to.be.revertedWithCustomError(
          token,
          REVERT_ERROR_ERC20_BALANCE_EXCEEDED,
        )
        .withArgs(await distributor.getAddress(), 0, REWARD_AMOUNT);
    });
  });

  describe("Function 'verifySignature()'", async () => {
    it("Is reverted if the chain id is invalid", async () => {
      const { distributor } = await loadFixture(deployContracts);
      const signature = await createSignature(
        deployer,
        REWARD_AMOUNT,
        0,
        HARDHAT_CHAIN_ID,
      );

      await expect(
        distributor.verifySignature(
          user.address,
          REWARD_AMOUNT,
          0,
          HARDHAT_CHAIN_ID + 1,
          signature,
        ),
      ).to.be.revertedWithCustomError(
        distributor,
        REVERT_ERROR_INVALID_CHAIN_ID,
      );
    });
  });
});
