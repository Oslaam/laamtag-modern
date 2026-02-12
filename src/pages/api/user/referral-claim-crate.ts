import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { walletAddress } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { walletAddress },
            select: { claimableRewards: true }
        });

        if (!user || user.claimableRewards <= 0) {
            return res.status(400).json({ error: "No rewards to claim" });
        }

        await prisma.$transaction([
            // 1. Update Balances
            prisma.user.update({
                where: { walletAddress },
                data: {
                    claimableRewards: { decrement: 1 },
                    tagTickets: { increment: 200 },
                    laamPoints: { increment: 500 }
                }
            }),

            // 2. Log TAG to History
            prisma.activity.create({
                data: {
                    userId: walletAddress,
                    type: "RECRUIT_REWARD",
                    asset: "TAG",
                    amount: 200,
                }
            }),

            // 3. Log LAAM to History
            prisma.activity.create({
                data: {
                    userId: walletAddress,
                    type: "RECRUIT_REWARD",
                    asset: "LAAM",
                    amount: 500,
                }
            }),

            // 4. Send SKR to Vault
            prisma.pendingReward.create({
                data: {
                    userId: walletAddress,
                    asset: "SKR",
                    amount: 500,
                    type: "RECRUIT_REWARD",
                    isClaimed: false
                }
            })
        ]);

        return res.status(200).json({
            success: true,
            message: "Crate opened! +200 TAG & +500 LAAM added to profile. +500 SKR sent to Loot Vault."
        });
    } catch (error) {
        console.error("Crate claim error:", error);
        return res.status(500).json({ error: "Claim failed" });
    }
}