import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { auth_key } = req.query;
    if (auth_key !== process.env.CRON_SECRET) return res.status(401).json({ error: "Unauthorized" });

    try {
        const now = new Date();
        const allStakes = await prisma.stakedNFT.findMany();

        for (const stake of allStakes) {
            const stakedDate = new Date(stake.stakedAt);
            const lastClaimed = new Date(stake.lastClaimed);

            // 1. Initial 48h Lock: Only drop rewards if staked for > 48 hours
            const hoursSinceStaking = (now.getTime() - stakedDate.getTime()) / (1000 * 60 * 60);
            if (hoursSinceStaking < 48) continue;

            // 2. 24h Interval: Check if it's been 24 hours since the last drop for THIS NFT
            const hoursSinceLastDrop = (now.getTime() - lastClaimed.getTime()) / (1000 * 60 * 60);

            if (hoursSinceLastDrop >= 24) {
                // FIXED INFINITE REWARD: 500 LAAM and 10 TAG per NFT
                const laamReward = 500;
                const tagReward = 10;

                await prisma.$transaction([
                    prisma.user.update({
                        where: { walletAddress: stake.ownerAddress },
                        data: {
                            laamPoints: { increment: laamReward },
                            tagTickets: { increment: tagReward }
                        }
                    }),
                    prisma.stakedNFT.update({
                        where: { mintAddress: stake.mintAddress },
                        data: { lastClaimed: now }
                    })
                ]);
            }
        }
        return res.status(200).json({ success: true, message: "Rewards processed." });
    } catch (error) {
        console.error("Cron Error:", error);
        return res.status(500).json({ error: "Automation failed" });
    }
}