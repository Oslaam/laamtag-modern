import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();
    const { walletAddress } = req.body;

    try {
        const refundableEntries = await prisma.raffleEntry.findMany({
            where: {
                walletAddress,
                status: 'PENDING',
                pool: {
                    status: 'OPEN',
                    expiresAt: { lt: new Date() }
                }
            },
            include: { pool: true }
        });

        if (refundableEntries.length === 0) {
            return res.status(400).json({ message: "No refundable entries found." });
        }

        const totalRefund = refundableEntries.reduce((sum, entry) => sum + entry.pool.entryFee, 0);

        // Update entries AND close the pools involved
        const poolIds = Array.from(new Set(refundableEntries.map(e => e.poolId)));

        await prisma.$transaction([
            prisma.raffleEntry.updateMany({
                where: { id: { in: refundableEntries.map(e => e.id) } },
                data: { status: 'REFUNDED' }
            }),
            prisma.rafflePool.updateMany({
                where: { id: { in: poolIds } },
                data: { status: 'EXPIRED' }
            })
        ]);

        return res.status(200).json({
            success: true,
            amount: totalRefund,
            message: `Refund processed for ${refundableEntries.length} entries.`
        });
    } catch (error) {
        return res.status(500).json({ error: "Refund processing failed" });
    }
}