import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { address } = req.query;

    if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: 'Wallet address is required' });
    }

    try {
        // Find the user in your database by their wallet address
        const user = await prisma.user.findUnique({
            where: { walletAddress: address },
            select: { warCredits: true }
        });

        // If user doesn't exist yet, they have 0 credits
        if (!user) {
            return res.status(200).json({ balance: 0 });
        }

        return res.status(200).json({ balance: user.warCredits });
    } catch (error) {
        console.error("Database Error:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}