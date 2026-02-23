import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address } = req.query;
    if (!address) return res.status(400).json({ rewards: [] });

    try {
        const rewards = await prisma.pendingReward.findMany({
            where: {
                userId: address as string,
                isClaimed: false
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return res.status(200).json({ rewards });
    } catch (error) {
        return res.status(500).json({ rewards: [] });
    }
}