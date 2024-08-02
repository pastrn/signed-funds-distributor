import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.LOCALHOST_RPC);

const contractAddress = process.env.DISTRIBUTOR_ADDRESS || "";
const abi = ["event RewardPaid(address indexed user, uint256 amount)"];

const contract = new ethers.Contract(contractAddress, abi, provider);

async function getEvents() {
  const filter = contract.filters.RewardPaid();

  const events = await contract.queryFilter(filter, 0, "latest");
  const data = events.map((event) => ({
    topics: event.topics,
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash,
  }));

  fs.writeFileSync("events.json", JSON.stringify(data, null, 2));
  console.log(`Saved ${data.length} events in events.json`);
}
