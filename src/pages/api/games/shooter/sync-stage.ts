import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // 1. Get both level AND stage from the request body
    const { walletAddress, level, stage } = req.body;

    if (!walletAddress) return res.status(400).json({ error: 'Missing wallet address' });

    try {
        // 2. Update both fields in your User model
        await prisma.user.update({
            where: { walletAddress },
            data: {
                shooterLevel: level, // This allows level 2, 3, 4...
                shooterStage: stage  // This allows stage 1-5
            }
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({ error: "Failed to sync stage" });
    }
}