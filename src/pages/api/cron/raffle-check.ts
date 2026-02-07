import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { auth_key } = req.query;
    if (auth_key !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        // 1. Find all OPEN pools that are past their expiry time
        const expiredPools = await prisma.rafflePool.findMany({
            where: {
                status: 'OPEN',
                expiresAt: { lt: new Date() }
            },
            include: { entries: true }
        });

        for (const pool of expiredPools) {
            if (pool.entries.length < 5) {
                // REFUND LOGIC: Move SKR to PendingReward as "REFUND"
                const refunds = pool.entries.map(entry => ({
                    userId: entry.walletAddress,
                    asset: 'SKR',
                    amount: pool.entryFee,
                    type: 'REFUND', // This bypasses the 1000 threshold later
                    isClaimed: false
                }));

                await prisma.pendingReward.createMany({ data: refunds });

                await prisma.rafflePool.update({
                    where: { id: pool.id },
                    data: { status: 'EXPIRED' }
                });
            } else {
                // If by some chance it's full but hasn't drawn yet
                await prisma.rafflePool.update({
                    where: { id: pool.id },
                    data: { status: 'LOCKED' }
                });
            }
        }

        return res.status(200).json({ success: true, processed: expiredPools.length });
    } catch (error) {
        return res.status(500).json({ error: "Cron failed" });
    }
}