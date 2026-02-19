import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

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
                hasAccess: true,
                lastWarriorMint: true,
                lastWarriorMintBatch: true // ADDED THIS: frontend needs this to calculate batch lock
            }
        });

        if (!user) {
            return res.status(200).json({
                isWarrior: false,
                lastWarriorMint: null,
                lastWarriorMintBatch: -1,
                personalMinted: 0
            });
        }

        const isWarrior = user.hasAccess || user.personalMinted > 0;

        return res.status(200).json({
            isWarrior,
            lastWarriorMint: user.lastWarriorMint,
            lastWarriorMintBatch: user.lastWarriorMintBatch, // SEND THIS BACK
            personalMinted: user.personalMinted
        });

    } catch (error) {
        console.error("API_CHECK_ERROR:", error);
        return res.status(500).json({ error: 'Database error' });
    }
}