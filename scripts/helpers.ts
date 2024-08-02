import { ethers } from "ethers"
import dotenv from "dotenv";
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.LOCALHOST_RPC);

const contractAddress = process.env.DISTRIBUTOR_ADDRESS || "";
const abi = [
    "function getNonce(address user) external view returns (uint256)",
    "function verifySignature(address user, uint256 amount, uint256 nonce, uint256 chainId, bytes memory signature) public view returns (bool)"
];

const contract = new ethers.Contract(contractAddress, abi, provider);

export async function getNonce(userAddress: string): Promise<number> {
    try {
        const nonce = await contract.getNonce(userAddress);
        return Number(nonce);
    } catch (error) {
        console.error("Error getting nonce:", error);
        throw error;
    }
}

export async function verifySignature(user: string, amount: number, nonce: number, chainId: number, signature: string): Promise<boolean> {
    try {
        return await contract.verifySignature(user, amount, nonce, chainId, signature);
    } catch (error) {
        console.error("Error getting nonce:", error);
        throw error;
    }
}