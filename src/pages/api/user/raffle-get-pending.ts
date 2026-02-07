import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { walletAddress } = req.query;
    if (!walletAddress) return res.status(400).json({ rewards: [] });

    try {
        // --- 1. PROACTIVE REFUND CHECK ---
        const expiredEntries = await prisma.raffleEntry.findMany({
            where: {
                walletAddress: walletAddress as string,
                status: 'PENDING',
                pool: {
                    status: 'OPEN',
                    expiresAt: { lt: new Date() }
                }
            },
            include: { pool: true }
        });

        if (expiredEntries.length > 0) {
            for (const entry of expiredEntries) {
                await prisma.$transaction([
                    prisma.pendingReward.create({
                        data: {
                            userId: entry.walletAddress,
                            amount: entry.pool.entryFee,
                            asset: 'SKR',
                            type: 'REFUND',
                            isClaimed: false
                        }
                    }),
                    prisma.raffleEntry.update({
                        where: { id: entry.id },
                        data: { status: 'REFUNDED' }
                    }),
                    // CLOSE THE LOOPHOLE: Mark the pool as EXPIRED immediately
                    prisma.rafflePool.update({
                        where: { id: entry.poolId },
                        data: { status: 'EXPIRED' }
                    })
                ]);
            }
        }

        // --- 2. FETCH ALL PENDING REFUNDS ---
        const rewards = await prisma.pendingReward.findMany({
            where: {
                userId: walletAddress as string,
                isClaimed: false,
                type: 'REFUND'
            }
        });

        return res.status(200).json({ rewards });
    } catch (error) {
        console.error("GET_PENDING_ERROR:", error);
        return res.status(500).json({ rewards: [] });
    }
}