import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { logActivity } from '../../../../lib/activityLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { walletAddress, type } = req.body;

    if (!walletAddress) return res.status(400).json({ error: "Missing wallet address" });

    try {
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { walletAddress } });
            if (!user) throw new Error("User not found");

            let bonusLaam = 0;
            let bonusTag = 0;
            let isLevelWin = false;
            let isCritical = Math.random() < 0.10;

            const multiplier = isCritical ? 2 : 1;

            if (type === 'SPECIAL_BOMB_LAAM') {
                bonusLaam = (Math.floor(Math.random() * (150 - 50 + 1)) + 50) * multiplier;
            }
            else if (type === 'SPECIAL_BOMB_TAG') {
                bonusTag = (Math.floor(Math.random() * (3 - 1 + 1)) + 1) * multiplier;
            }
            else {
                // Boss Win Rewards
                const dbLevel = user.shooterLevel || 1;
                bonusLaam = Math.floor(250 * Math.pow(1.15, dbLevel - 1));
                bonusTag = Math.floor(10 * Math.pow(1.1, dbLevel - 1));
                isLevelWin = true;
                isCritical = false; // No critical on level wins
            }

            await tx.user.update({
                where: { walletAddress },
                data: {
                    laamPoints: { increment: bonusLaam },
                    tagTickets: { increment: bonusTag },
                    ...(isLevelWin && {
                        shooterLevel: { increment: 1 },
                        shooterStage: 1
                    })
                }
            });

            // Log activity for transparency
            const logType = isCritical ? `${type}_CRITICAL` : (type || 'SHOOTER_WIN');
            if (bonusLaam > 0) await logActivity(walletAddress, logType, bonusLaam, 'LAAM');
            if (bonusTag > 0) await logActivity(walletAddress, logType, bonusTag, 'TAG');

            return { laam: bonusLaam, tag: bonusTag, isCritical, type };
        });

        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error("REWARD_ERROR:", error);
        return res.status(500).json({ error: "Reward Failed" });
    }
}