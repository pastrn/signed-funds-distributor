import { HardhatUserConfig } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades"
import "@nomicfoundation/hardhat-toolbox";

import dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    localhost: {
      url: process.env.LOCALHOST_RPC,
      accounts: [process.env.LOCALHOST_PK ?? ""]
    },
  }
};

export default config;
