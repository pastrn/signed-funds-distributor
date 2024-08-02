import { ethers, upgrades } from "hardhat";

async function main() {
    const [ deployer ] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    const Token = await ethers.getContractFactory("TestToken");
    const token = await Token.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log("TestToken deployed to:", tokenAddress);

    const FundsDistributor = await ethers.getContractFactory("FundsDistributor");
    const distributor = await upgrades.deployProxy(
        FundsDistributor,
        [deployer.address, deployer.address, deployer.address, tokenAddress],
        { initializer: 'initialize', kind: "uups"}
    );
    await distributor.waitForDeployment();
    const distributorAddress = await distributor.getAddress();
    await distributor.mockEvents();
    console.log("FundsDistributor deployed to:", distributorAddress);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });