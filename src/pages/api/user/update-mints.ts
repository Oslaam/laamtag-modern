import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { walletAddress, actualCount } = req.body;

    if (walletAddress === undefined || actualCount === undefined) {
        return res.status(400).json({ error: "Missing parameters" });
    }

    try {
        // We use 'set' instead of 'increment' to ensure we match the blockchain reality
        const updatedUser = await prisma.user.update({
            where: { walletAddress },
            data: {
                personalMinted: actualCount, // Hard set to the actual number detected
            },
        });
        return res.status(200).json(updatedUser);
    } catch (error) {
        return res.status(500).json({ error: "Failed to sync mint count" });
    }
}