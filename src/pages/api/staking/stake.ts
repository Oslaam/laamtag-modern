// Logic for Reward Calculation:
// 1 NFT: 500 LAAM / 20 TAG
// 2 NFTs: 1000 LAAM / 40 TAG
// 3 NFTs: 1500 LAAM / 60 TAG (Corrected logic for progression)

import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Connection, PublicKey } from '@solana/web3.js';

const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { walletAddress, mintAddress } = req.body;

    try {
        // 1. SECURITY CHECK: Verify Ownership on-chain
        const connection = new Connection(HELIUS_RPC);
        const largestAccounts = await connection.getTokenLargestAccounts(new PublicKey(mintAddress));
        const largestAccountInfo = await connection.getParsedAccountInfo(largestAccounts.value[0].address);
        const actualOwner = (largestAccountInfo.value?.data as any).parsed.info.owner;

        if (actualOwner !== walletAddress) {
            return res.status(403).json({ message: "You do not own this NFT" });
        }

        // 2. DATABASE LOCK: Register the stake with 48h cooldown start
        await prisma.stakedNFT.create({
            data: {
                mintAddress,
                ownerAddress: walletAddress,
                stakedAt: new Date(),
                lastClaimed: new Date(), // Start counting from now
            }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ message: "Verification failed" });
    }
}