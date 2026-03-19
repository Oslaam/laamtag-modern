import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getRank } from '../../../utils/ranks'; // 1. Import your rank utility

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { auth_key } = req.query;
    if (auth_key !== process.env.CRON_SECRET) return res.status(401).json({ error: "Unauthorized" });

    try {
        const now = new Date();
        const allStakes = await prisma.stakedNFT.findMany();

        for (const stake of allStakes) {
            const stakedDate = new Date(stake.stakedAt);
            const lastClaimed = new Date(stake.lastClaimed);

            const hoursSinceStaking = (now.getTime() - stakedDate.getTime()) / (1000 * 60 * 60);
            if (hoursSinceStaking < 48) continue;

            const hoursSinceLastDrop = (now.getTime() - lastClaimed.getTime()) / (1000 * 60 * 60);

            if (hoursSinceLastDrop >= 24) {
                const laamReward = 500;
                const tagReward = 20;

                // 2. Fetch the user to see their current points
                const user = await prisma.user.findUnique({
                    where: { walletAddress: stake.ownerAddress },
                    select: { laamPoints: true }
                });

                if (user) {
                    // 3. Calculate new total and new rank name
                    const newTotalPoints = user.laamPoints + laamReward;
                    const newRankName = getRank(newTotalPoints).name;

                    await prisma.$transaction([
                        prisma.user.update({
                            where: { walletAddress: stake.ownerAddress },
                            data: {
                                laamPoints: newTotalPoints, // Set the actual total
                                tagTickets: { increment: tagReward },
                                rank: newRankName // 4. SAVE the new rank to the DB
                            }
                        }),
                        prisma.stakedNFT.update({
                            where: { mintAddress: stake.mintAddress },
                            data: { lastClaimed: now }
                        })
                    ]);
                }
            }
        }
        return res.status(200).json({ success: true, message: "Rewards processed." });
    } catch (error) {
        console.error("Cron Error:", error);
        return res.status(500).json({ error: "Automation failed" });
    }
}