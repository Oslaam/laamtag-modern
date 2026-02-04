import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    // 1. GET winChance FROM FRONTEND
    const { walletAddress, winChance } = req.body; 
    const ENTRY_COST = 50;

    // Safety check: ensure winChance is between 2 and 90
    const finalWinChance = Math.max(2, Math.min(90, winChance || 45));

    try {
        const user = await prisma.user.findUnique({
            where: { walletAddress },
            include: {
                activities: { orderBy: { createdAt: 'desc' }, take: 1 },
                _count: { select: { activities: true } }
            }
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        // Rate limit check
        if (user.activities.length > 0) {
            const lastRoll = new Date(user.activities[0].createdAt).getTime();
            if (Date.now() - lastRoll < 2000) return res.status(429).json({ error: "COOLING DOWN..." });
        }

        if (!user.hasPaidDiceEntry) return res.status(403).json({ error: "Entry fee not paid" });
        if (user.tagTickets < ENTRY_COST) return res.status(400).json({ error: "Insufficient TAG" });

        // Provably Fair Roll (0 - 10000)
        const serverSeed = process.env.DICE_SERVER_SECRET || 'fallback-secret';
        const nonce = user._count.activities;
        const combinedHash = crypto.createHmac('sha256', serverSeed).update(`${walletAddress}-${nonce}`).digest('hex');
        
        // rollResultRaw is 0 to 10000. 
        // We compare it against winChance * 100 (e.g., 90% becomes 9000)
        const rollResultRaw = (parseInt(combinedHash.substring(0, 8), 16) % 10001);
        const rollDisplay = rollResultRaw / 100; // This is the 86.11 you see

        // --- DYNAMIC WIN CALCULATION ---
        // A win happens if rollDisplay is LESS THAN OR EQUAL TO the slider chance
        const isWin = rollDisplay <= finalWinChance;
        
        let profitOnWin = 0;
        let winType = "LOSS";

        if (isWin) {
            // Standard Multiplier logic: 99 / winChance
            // Example: 90% chance = 1.1x multiplier. 50 TAG * 1.1 = 55 SKR reward.
            const multiplier = 99 / finalWinChance;
            profitOnWin = Math.floor(ENTRY_COST * multiplier);
            
            // Assign labels for the Activity Feed based on how "rare" the win was
            if (finalWinChance <= 5) winType = "JACKPOT";
            else if (finalWinChance <= 15) winType = "BIG_WIN";
            else winType = "DICE_WIN";
        }

        const updatedUser = await prisma.$transaction(async (tx) => {
            return await tx.user.update({
                where: { walletAddress },
                data: {
                    tagTickets: { decrement: ENTRY_COST },
                    activities: {
                        create: {
                            type: isWin ? `DICE_${winType}` : "DICE_LOSS",
                            asset: isWin ? "SKR" : "TAG",
                            amount: isWin ? profitOnWin : -ENTRY_COST,
                        }
                    },
                    pendingRewards: isWin ? {
                        create: {
                            asset: "SKR",
                            amount: profitOnWin,
                            isClaimed: false
                        }
                    } : undefined
                }
            });
        });

        return res.status(200).json({
            success: true,
            rollResult: rollDisplay,
            isWin,
            reward: profitOnWin,
            newTagBalance: updatedUser.tagTickets,
            nextNonce: nonce + 1
        });

    } catch (error) {
        console.error("Dice Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}