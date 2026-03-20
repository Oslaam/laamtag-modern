import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { walletAddress, winChance } = req.body;
    const ENTRY_COST = 50;

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

        // Provably Fair Roll
        const serverSeed = process.env.DICE_SERVER_SECRET || 'fallback-secret';
        const nonce = user._count.activities;
        const combinedHash = crypto
            .createHmac('sha256', serverSeed)
            .update(`${walletAddress}-${nonce}`)
            .digest('hex');

        const rollResultRaw = parseInt(combinedHash.substring(0, 8), 16) % 10001;
        const rollDisplay = rollResultRaw / 100;

        const isWin = rollDisplay <= finalWinChance;

        let profitOnWin = 0;
        let winType = "LOSS";

        if (isWin) {
            const multiplier = 99 / finalWinChance;
            profitOnWin = Math.floor(ENTRY_COST * multiplier);
            if (finalWinChance <= 5) winType = "JACKPOT";
            else if (finalWinChance <= 15) winType = "BIG_WIN";
            else winType = "DICE_WIN";
        }

        // ── Sequential writes — no transaction, no timeout risk ──

        // 1. Deduct entry cost
        const updatedUser = await prisma.user.update({
            where: { walletAddress },
            data: { tagTickets: { decrement: ENTRY_COST } }
        });

        // 2. Log activity
        await prisma.activity.create({
            data: {
                userId: walletAddress,
                type: isWin ? `DICE_${winType}` : "DICE_LOSS",
                asset: isWin ? "SKR" : "TAG",
                amount: isWin ? profitOnWin : -ENTRY_COST,
            }
        });

        // 3. Create pending reward if win
        if (isWin) {
            await prisma.pendingReward.create({
                data: {
                    userId: walletAddress,
                    asset: "SKR",
                    amount: profitOnWin,
                    isClaimed: false
                }
            });
        }

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