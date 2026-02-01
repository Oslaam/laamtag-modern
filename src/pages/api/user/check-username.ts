// src/pages/api/user/check-username.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
        return res.status(400).json({ available: false });
    }

    // Always check the version with .laam attached
    const coreName = username.replace('.laam', '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const checkName = `${coreName}.laam`;

    try {
        const existingUser = await prisma.user.findFirst({
            where: {
                username: { equals: checkName, mode: 'insensitive' }
            },
        });

        return res.status(200).json({
            available: !existingUser,
            suggested: checkName
        });
    } catch (error) {
        return res.status(500).json({ error: 'Database error' });
    }
}