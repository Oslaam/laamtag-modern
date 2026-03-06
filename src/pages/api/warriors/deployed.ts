import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: 'Wallet address required' });
    }

    try {
        const warriors = await prisma.deployedWarrior.findMany({
            where: { ownerAddress: address },
            orderBy: { deployedAt: 'desc' }
        });

        return res.status(200).json(warriors);
    } catch (error) {
        console.error('Fetch Error:', error);
        return res.status(500).json({ error: 'Failed to fetch warriors' });
    }
}