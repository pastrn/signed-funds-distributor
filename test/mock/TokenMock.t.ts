import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, ContractFactory } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Contract TokenMock", async () => {
  const TOKEN_NAME = "TestToken";
  const TOKEN_SYMBOL = "TEST";
  const PREMINT = BigInt(1_000_000);
  const MINT_AMOUNT = 322;

  let tokenFactory: ContractFactory;
  let deployer: HardhatEthersSigner;

  before(async () => {
    [deployer] = await ethers.getSigners();
    tokenFactory = await ethers.getContractFactory("TestToken");
  });

  async function deployToken(): Promise<{ token: Contract }> {
    let token: Contract = (await tokenFactory.deploy()) as Contract;
    await token.waitForDeployment;
    token = token.connect(deployer) as Contract;

    return {
      token,
    };
  }

  describe("Constructor'", async () => {
    it("Configures contract as expected", async () => {
      const { token } = await loadFixture(deployToken);

      expect(await token.name()).to.eq(TOKEN_NAME);
      expect(await token.symbol()).to.eq(TOKEN_SYMBOL);
      expect(BigInt(await token.balanceOf(deployer.address))).to.eq(PREMINT);
    });
  });

  describe("Function 'mint()'", async () => {
    it("Mints tokens as expected", async () => {
      const { token } = await loadFixture(deployToken);

      const balanceBefore: bigint = await token.balanceOf(deployer.address);
      await expect(
        token.mint(deployer.address, MINT_AMOUNT),
      ).to.changeTokenBalance(token, deployer, MINT_AMOUNT);
      const balanceAfter: bigint = await token.balanceOf(deployer.address);

      expect(balanceAfter).to.eq(balanceBefore + BigInt(MINT_AMOUNT));
    });
  });
});
