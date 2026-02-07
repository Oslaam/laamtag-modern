import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();
    const { poolId, walletAddress, signature } = req.body;

    try {
        const result = await prisma.$transaction(async (tx) => {
            const count = await tx.raffleEntry.count({ where: { poolId } });
            if (count >= 5) throw new Error("POOL_FULL");

            const entry = await tx.raffleEntry.create({
                data: { poolId, walletAddress, txSignature: signature }
            });

            // --- FIXED: Using 'activity' instead of 'transaction' ---
            await tx.activity.create({
                data: {
                    userId: walletAddress, // Schema uses userId (mapped to walletAddress)
                    type: 'RAFFLE_ENTRY_COST',
                    amount: 500,
                    asset: 'SKR',
                    signature: signature
                }
            });

            if (count === 4) {
                const allEntries = await tx.raffleEntry.findMany({ where: { poolId } });
                return { process: true, entries: allEntries };
            }
            return { process: false };
        });

        if (result.process) {
            await processWinners(poolId, result.entries);
        }

        return res.status(200).json({ success: true });
    } catch (error: any) {
        const msg = error.message === "POOL_FULL" ? "Pool is already full" : "Failed to join";
        return res.status(500).json({ message: msg });
    }
}

async function processWinners(poolId: string, entries: any[]) {
    const shuffled = entries.sort(() => 0.5 - Math.random());

    // Update Raffle Entry statuses
    await prisma.raffleEntry.update({ where: { id: shuffled[0].id }, data: { status: 'WINNER_1ST' } });
    await prisma.raffleEntry.update({ where: { id: shuffled[1].id }, data: { status: 'WINNER_2ND' } });
    await prisma.raffleEntry.update({ where: { id: shuffled[2].id }, data: { status: 'WINNER_3RD' } });
    await prisma.raffleEntry.update({ where: { id: shuffled[3].id }, data: { status: 'CHALLENGER_4TH' } });
    await prisma.raffleEntry.update({ where: { id: shuffled[4].id }, data: { status: 'CHALLENGER_5TH' } });

    // Rewards for Top 3 (SKR)
    const winners = [
        { wallet: shuffled[0].walletAddress, amount: 1000 },
        { wallet: shuffled[1].walletAddress, amount: 700 },
        { wallet: shuffled[2].walletAddress, amount: 600 },
    ];

    for (const winner of winners) {
        await prisma.pendingReward.create({
            data: { userId: winner.wallet, asset: 'SKR', amount: winner.amount, type: 'REWARD' }
        });

        // Log to Activity history
        await prisma.activity.create({
            data: {
                userId: winner.wallet,
                type: 'RAFFLE_WIN',
                amount: winner.amount,
                asset: 'SKR'
            }
        });
    }

    // Points/TAG for 4th and 5th
    for (const challenger of [shuffled[3], shuffled[4]]) {
        await prisma.user.update({
            where: { walletAddress: challenger.walletAddress },
            data: {
                laamPoints: { increment: 10000 },
                tagTickets: { increment: 200 }
            }
        });

        // Log LAAM Reward to History
        await prisma.activity.create({
            data: {
                userId: challenger.walletAddress,
                type: 'RAFFLE_REWARD_LAAM',
                amount: 10000,
                asset: 'LAAM'
            }
        });

        // Log TAG Reward to History
        await prisma.activity.create({
            data: {
                userId: challenger.walletAddress,
                type: 'RAFFLE_REWARD_TAG',
                amount: 200,
                asset: 'TAG'
            }
        });
    }

    await prisma.rafflePool.update({
        where: { id: poolId },
        data: { status: 'LOCKED' }
    });
}