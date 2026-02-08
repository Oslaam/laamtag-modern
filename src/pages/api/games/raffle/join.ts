import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { Prisma } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { poolId, walletAddress, signature } = req.body;
    const normalizedAddress = walletAddress.trim();

    let retries = 0;
    const MAX_RETRIES = 3;

    while (retries < MAX_RETRIES) {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1. Check if Pool is full
                const count = await tx.raffleEntry.count({ where: { poolId } });
                if (count >= 5) throw new Error("POOL_FULL");

                // 2. Check for existing entry (Prevents double-charging if they click fast)
                const existing = await tx.raffleEntry.findUnique({
                    where: { poolId_walletAddress: { poolId, walletAddress: normalizedAddress } }
                });
                if (existing) throw new Error("ALREADY_ENTERED");

                // 3. Create Raffle Entry
                await tx.raffleEntry.create({
                    data: { poolId, walletAddress: normalizedAddress, txSignature: signature }
                });

                // 4. Create Activity Log
                await tx.activity.create({
                    data: {
                        userId: normalizedAddress,
                        type: 'RAFFLE_ENTRY_COST',
                        amount: 500,
                        asset: 'SKR',
                        signature: signature
                    }
                });

                // 5. If this was the 5th entry, trigger process
                if (count === 4) {
                    const allEntries = await tx.raffleEntry.findMany({ where: { poolId } });
                    return { process: true, entries: allEntries };
                }
                return { process: false };
            }, {
                // Serializable prevents "Phantom Reads" (two people becoming the 5th person)
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable
            });

            if (result.process) {
                await processWinners(poolId, result.entries!);
            }

            return res.status(200).json({ success: true });

        } catch (error: any) {
            // Handle Database Deadlocks (Common for high-activity "Top 10" users)
            if (error.code === 'P2034' || error.message.includes('deadlock')) {
                retries++;
                // Wait 100ms before retrying
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }

            console.error(`Raffle Join Error:`, error.message);
            const msg = error.message === "POOL_FULL" ? "Pool is full" :
                error.message === "ALREADY_ENTERED" ? "Already joined" : "Failed to join";
            return res.status(500).json({ message: msg });
        }
    }
}

async function processWinners(poolId: string, entries: any[]) {
    // Shuffle logic
    const shuffled = [...entries].sort(() => 0.5 - Math.random());

    // 1. Update Pool Status immediately to prevent new entries
    await prisma.rafflePool.update({
        where: { id: poolId },
        data: { status: 'LOCKED' }
    });

    // 2. Update Raffle Entry statuses
    const statuses = ['WINNER_1ST', 'WINNER_2ND', 'WINNER_3RD', 'CHALLENGER_4TH', 'CHALLENGER_5TH'];
    for (let i = 0; i < shuffled.length; i++) {
        await prisma.raffleEntry.update({
            where: { id: shuffled[i].id },
            data: { status: statuses[i] }
        });
    }

    // 3. Rewards for Top 3 (SKR via PendingReward)
    const prizeAmounts = [1000, 700, 600];
    for (let i = 0; i < 3; i++) {
        const winner = shuffled[i];
        await prisma.pendingReward.create({
            data: { userId: winner.walletAddress, asset: 'SKR', amount: prizeAmounts[i], type: 'REWARD' }
        });
        await prisma.activity.create({
            data: { userId: winner.walletAddress, type: 'RAFFLE_WIN', amount: prizeAmounts[i], asset: 'SKR' }
        });
    }

    // 4. Points/TAG for 4th and 5th (Direct Update)
    for (let i = 3; i < 5; i++) {
        const challenger = shuffled[i];
        await prisma.user.update({
            where: { walletAddress: challenger.walletAddress },
            data: {
                laamPoints: { increment: 10000 },
                tagTickets: { increment: 200 }
            }
        });

        // Log both asset rewards
        await prisma.activity.createMany({
            data: [
                { userId: challenger.walletAddress, type: 'RAFFLE_REWARD_LAAM', amount: 10000, asset: 'LAAM' },
                { userId: challenger.walletAddress, type: 'RAFFLE_REWARD_TAG', amount: 200, asset: 'TAG' }
            ]
        });
    }
}