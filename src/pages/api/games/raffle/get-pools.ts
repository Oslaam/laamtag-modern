import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ message: "Method not allowed" });

    try {
        // Change the 'where' clause to this:
        const pools = await prisma.rafflePool.findMany({
            where: {
                status: { in: ['OPEN', 'LOCKED', 'EXPIRED'] }, // Show completed and expired too
            },
            include: {
                entries: true,
            },
            take: 10, // Limit so the list doesn't get too long
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({
            success: true,
            pools: pools
        });
        
    } catch (error) {
        console.error("GET_POOLS_ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch active pools."
        });
    }
}