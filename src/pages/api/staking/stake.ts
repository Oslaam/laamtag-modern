// Logic for Reward Calculation:
// 1 NFT: 500 LAAM / 20 TAG
// 2 NFTs: 1000 LAAM / 40 TAG
// 3 NFTs: 1500 LAAM / 60 TAG

import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { walletAddress, mintAddress, signature } = req.body;

    if (!walletAddress || !mintAddress) {
        return res.status(400).json({ message: "Missing wallet or mint address" });
    }

    try {
        // 1. UNIQUE CHECK: Prevent double-staking or hijacking
        const existing = await prisma.stakedNFT.findUnique({
            where: { mintAddress }
        });

        if (existing) {
            return res.status(400).json({
                message: "This NFT is already locked in a vault."
            });
        }

        // 2. DATABASE REGISTRATION
        // Since the frontend successfully moved the NFT to the Vault PDA on-chain,
        // we now record that event here to start the 48h clock.
        await prisma.stakedNFT.create({
            data: {
                mintAddress,
                ownerAddress: walletAddress,
                stakedAt: new Date(),
                lastClaimed: new Date(),
                // If you added 'signature' to your schema, uncomment below:
                // signature: signature 
            }
        });

        return res.status(200).json({
            success: true,
            message: "Vault Secured. Rewards emitting."
        });
    } catch (error: any) {
        console.error("Staking DB Error:", error);
        return res.status(500).json({ message: "Failed to record stake. Contact support." });
    }
}