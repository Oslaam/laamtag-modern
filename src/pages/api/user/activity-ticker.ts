import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const activities = await prisma.activity.findMany({
            take: 15,
            orderBy: { createdAt: 'desc' },
            select: {
                userId: true,
                type: true,
                asset: true,
                amount: true,
                createdAt: true
            }
        });
        res.status(200).json(activities);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch feed" });
    }
}