import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: "Address required" });

    try {
        const tickets = await prisma.supportTicket.findMany({
            where: { walletAddress: address as string },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(tickets);
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch history" });
    }
}