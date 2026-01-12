import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { walletAddress, stage } = req.body;

    try {
        await prisma.user.update({
            where: { walletAddress },
            data: { shooterStage: stage }
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Failed to sync stage" });
    }
}