import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { walletAddress, username } = req.body;

    if (!walletAddress || !username) {
        return res.status(400).json({ error: "Missing data" });
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { walletAddress },
            data: { username },
        });
        return res.status(200).json({ success: true, username: updatedUser.username });
    } catch (error) {
        console.error("Sync Error:", error);
        return res.status(500).json({ error: "Failed to sync username" });
    }
}