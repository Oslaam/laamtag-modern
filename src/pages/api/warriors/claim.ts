// src/pages/api/warriors/claim.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RARITY_MULTIPLIERS: Record<string, number> = {
    "Common": 1.0,
    "Uncommon": 1.5,
    "Rare": 2.5,
    "Epic": 5.0
};

const BASE_YIELD = {
    "NORMAL": 100,
    "VIP": 250
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { mintAddress, walletAddress } = req.body;

    if (!mintAddress || !walletAddress) {
        return res.status(400).json({ error: "Missing required parameters." });
    }

    try {
        // 1. ATOMIC FETCH & LOCK
        // We look for a warrior that is DEPLOYED AND owned by the requester
        const warrior = await prisma.deployedWarrior.findFirst({
            where: {
                mintAddress,
                ownerAddress: walletAddress, // CRITICAL: Ownership Check
                status: 'DEPLOYED'           // CRITICAL: State Check
            },
        });

        if (!warrior) {
            return res.status(400).json({ error: "Warrior not found, not owned by you, or already claimed." });
        }

        // 2. Check if mission is actually finished
        const now = new Date();
        if (warrior.missionEnd && now < warrior.missionEnd) {
            return res.status(400).json({ error: "Mission still in progress." });
        }

        // 3. Calculate Reward
        const base = BASE_YIELD[warrior.location as keyof typeof BASE_YIELD] || 100;
        const multiplier = RARITY_MULTIPLIERS[warrior.rarity] || 1.0;
        const totalReward = base * multiplier;

        // 4. TRANSACTION: Execute update and credit in one block
        await prisma.$transaction([
            prisma.user.update({
                where: { walletAddress: walletAddress },
                data: { warCredits: { increment: totalReward } }
            }),
            prisma.deployedWarrior.update({
                where: { mintAddress },
                data: {
                    status: 'IDLE',
                    location: null,
                    missionEnd: null
                }
            })
        ]);

        return res.status(200).json({
            success: true,
            reward: totalReward
        });

    } catch (error) {
        console.error("Claim Error:", error);
        return res.status(500).json({ error: "Extraction failed. Server error." });
    }
}