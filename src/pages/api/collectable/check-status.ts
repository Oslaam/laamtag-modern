import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { walletAddress } = req.query;

    if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ error: 'Wallet address required' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { walletAddress },
            select: { 
                personalMinted: true,
                hasAccess: true, // Checking if they are authorized
                lastWarriorMint: true // CRITICAL for the 24h timer
            }
        });

        if (!user) {
            return res.status(200).json({ 
                isWarrior: false, 
                lastWarriorMint: null,
                personalMinted: 0 
            });
        }

        // Logic: A user is a "Warrior" if they have the hasAccess flag OR have minted before
        const isWarrior = user.hasAccess || user.personalMinted > 0;

        return res.status(200).json({ 
            isWarrior,
            lastWarriorMint: user.lastWarriorMint,
            personalMinted: user.personalMinted
        });
        
    } catch (error) {
        console.error("API_CHECK_ERROR:", error);
        return res.status(500).json({ error: 'Database error' });
    } finally {
        await prisma.$disconnect();
    }
}