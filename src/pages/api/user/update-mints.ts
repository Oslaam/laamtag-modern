import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { walletAddress, amount } = req.body;

    try {
        const updatedUser = await prisma.user.update({
            where: { walletAddress },
            data: {
                personalMinted: {
                    increment: amount, // This adds the new mints to their current total
                },
            },
        });
        return res.status(200).json(updatedUser);
    } catch (error) {
        return res.status(500).json({ error: "Failed to update mint count" });
    }
}