// src/pages/api/user/swapActivity.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { wallet } = req.query; // Pages router uses req.query

    if (!wallet) return res.status(400).json({ error: "Missing wallet" });

    try {
        const activities = await prisma.activity.findMany({
            where: {
                userId: wallet as string,
                type: "SWAP",
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        return res.status(200).json({ activities });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}