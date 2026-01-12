// src/pages/api/games/shooter/reward.ts
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
            let isCritical = false;

            // Determine if this is a Critical Hit (10% chance)
            // We only apply this to bombs, not level wins
            if ((type === 'SPECIAL_BOMB_LAAM' || type === 'SPECIAL_BOMB_TAG') && Math.random() < 0.10) {
                isCritical = true;
            }

            const multiplier = isCritical ? 2 : 1;

            // --- 1. HANDLE LAAM BOMB ---
            if (type === 'SPECIAL_BOMB_LAAM') {
                bonusLaam = (Math.floor(Math.random() * (200 - 50 + 1)) + 50) * multiplier;
                bonusTag = 0;
                isLevelWin = false;
            }

            // --- 2. HANDLE TAG BOMB ---
            else if (type === 'SPECIAL_BOMB_TAG') {
                bonusLaam = 0;
                bonusTag = (Math.floor(Math.random() * (5 - 1 + 1)) + 1) * multiplier;
                isLevelWin = false;
            }

            // --- 3. HANDLE LEVEL WIN (BOSS DEFEAT) ---
            else {
                const dbLevel = user.shooterLevel || 1;
                // Standard rewards for finishing a level (multiplier not applied here)
                bonusLaam = Math.floor(200 * Math.pow(1.1, dbLevel - 1));
                bonusTag = Math.floor(20 * Math.pow(1.1, dbLevel - 1));
                isLevelWin = true;
            }

            // Update user points in Database
            const updatedUser = await tx.user.update({
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

            // Log activities only if amount > 0
            const logSuffix = isCritical ? " (CRITICAL 2X)" : "";
            if (bonusLaam > 0) {
                await logActivity(walletAddress, (type || 'GAME_REWARD') + logSuffix, bonusLaam, 'LAAM');
            }
            if (bonusTag > 0) {
                await logActivity(walletAddress, (type || 'GAME_REWARD') + logSuffix, bonusTag, 'TAG');
            }

            // Return everything to the frontend
            return {
                laam: bonusLaam,
                tag: bonusTag,
                type,
                isCritical
            };
        });

        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error("REWARD_ERROR:", error);
        return res.status(500).json({ error: "Reward Failed" });
    }
}