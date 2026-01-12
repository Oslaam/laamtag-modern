import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    // Use 'walletAddress' to match your DB field name
    const { wallet } = req.query;

    if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'Wallet address required' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { walletAddress: wallet },
            select: {
                weaponLevel: true,
                shieldLevel: true,
                shoeLevel: true,
                lifeLevel: true,
                tagTickets: true,
                // Add any other stats you want to persist
            }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        return res.status(200).json({
            success: true,
            stats: {
                // Using 'as any' to bypass the weaponLevel TS error we saw earlier
                weaponLevel: (user as any).weaponLevel || 1,
                shieldLevel: (user as any).shieldLevel || 1,
                shoeLevel: (user as any).shoeLevel || 1,
                lifeLevel: (user as any).lifeLevel || 3,
                balance: user.tagTickets
            }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}