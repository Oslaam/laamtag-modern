import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: "Address required" });

    try {
        const history = await prisma.rewardHistory.findMany({
            where: { walletAddress: address as string },
            orderBy: { unstakedAt: 'desc' },
            take: 10,
        });

        const totals = history.reduce((acc, curr) => ({
            laam: acc.laam + curr.laamEarned,
            tag: acc.tag + curr.tagEarned
        }), { laam: 0, tag: 0 });

        return res.status(200).json({ history, totals });
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch reward history" });
    }
}