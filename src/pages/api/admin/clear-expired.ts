import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

const ADMIN_WALLETS = [
    "E4cHwRYWTznNjTvchSkZVXH8LWqdWbLekVXWjzmite6M",
    "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    // Admin check using header (consistent with your dashboard)
    const adminWallet = req.headers['x-admin-wallet'] as string;
    if (!adminWallet || !ADMIN_WALLETS.includes(adminWallet)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        // 1. Find the pools that need clearing
        const expiredPools = await prisma.rafflePool.findMany({
            where: {
                status: 'OPEN',
                expiresAt: { lt: new Date() }
            },
            include: { entries: true }
        });

        let refundCount = 0;

        // 2. Process Refunds (Mirroring your cronjob logic)
        for (const pool of expiredPools) {
            if (pool.entries.length > 0) {
                const refunds = pool.entries.map(entry => ({
                    userId: entry.walletAddress,
                    asset: 'SKR',
                    amount: pool.entryFee,
                    type: 'REFUND',
                    isClaimed: false
                }));

                await prisma.pendingReward.createMany({ data: refunds });
                refundCount += refunds.length;
            }

            // 3. Mark as EXPIRED (Don't delete, so you have history/logs)
            await prisma.rafflePool.update({
                where: { id: pool.id },
                data: { status: 'EXPIRED' }
            });
        }

        return res.status(200).json({
            success: true,
            count: expiredPools.length,
            refundsProcessed: refundCount
        });
    } catch (error) {
        console.error("Manual purge failed:", error);
        return res.status(500).json({ error: "Cleanup failed" });
    }
}