import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
        return res.status(400).json({ available: false });
    }

    const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15);

    try {
        const existingUser = await prisma.user.findFirst({
            where: {
                username: { equals: cleanUsername, mode: 'insensitive' }
            },
        });

        // If no user found, the name is available
        return res.status(200).json({ available: !existingUser });
    } catch (error) {
        return res.status(500).json({ error: 'Database error' });
    }
}