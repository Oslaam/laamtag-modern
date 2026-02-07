import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).end();

    const { walletAddress } = req.query;

    if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ message: "Wallet address required" });
    }

    try {
        // Fetch pools where the user has an entry
        const history = await prisma.rafflePool.findMany({
            where: {
                entries: {
                    some: { walletAddress: walletAddress }
                }
            },
            include: {
                entries: true // Include entries to determine user's rank/status
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 20 // Limit to last 20 games for performance
        });

        // Format the data so the frontend doesn't have to "search" for the user's entry
        const formattedHistory = history.map(pool => {
            const userEntry = pool.entries.find(e => e.walletAddress === walletAddress);
            return {
                id: pool.id,
                fee: pool.entryFee,
                status: pool.status, // OPEN, LOCKED, EXPIRED
                createdAt: pool.createdAt,
                userResult: userEntry?.status || 'PENDING', // WINNER_1ST, LOSER, etc.
                totalParticipants: pool.entries.length
            };
        });

        return res.status(200).json({ history: formattedHistory });
    } catch (error) {
        console.error("History Fetch Error:", error);
        return res.status(500).json({ message: "Failed to load history" });
    }
}