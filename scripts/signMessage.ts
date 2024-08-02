import { ethers } from 'ethers';
import { getNonce } from "./helpers";
import dotenv from "dotenv";
dotenv.config();

const privateKey = process.env.LOCALHOST_PK;

// @ts-ignore
const wallet = new ethers.Wallet(privateKey);

async function signMessage(user: string, amount: number, chainId: number): Promise<string> {

    const nonce = await getNonce(user);

    const message = ethers.solidityPackedKeccak256(
        ['address', 'uint256', 'uint256', 'uint256'],
        [wallet.address, amount, nonce, chainId]
    );
    const messageHashBin = ethers.getBytes(message);

    return await wallet.signMessage(messageHashBin);
}