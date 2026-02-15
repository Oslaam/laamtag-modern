import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { senderId, receiverId, poolId, gameType } = req.body;

    try {
        const invite = await prisma.gameInvite.create({
            data: { senderId, receiverId, poolId, gameType }
        });
        return res.status(200).json(invite);
    } catch (error) {
        return res.status(500).json({ error: "Failed to send invite" });
    }
}