import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address } = req.query;

    if (!address) return res.status(400).json({ error: "Wallet address required" });

    try {
        if (req.method === 'GET') {
            const list = await prisma.notification.findMany({
                where: { userId: address as string },
                orderBy: { createdAt: 'desc' },
                take: 15
            });
            return res.status(200).json(list);
        }

        if (req.method === 'PATCH') {
            await prisma.notification.updateMany({
                where: { userId: address as string, isRead: false },
                data: { isRead: true }
            });
            return res.status(200).json({ success: true });
        }
    } catch (error) {
        res.status(500).json({ error: "Notification system error" });
    }
}