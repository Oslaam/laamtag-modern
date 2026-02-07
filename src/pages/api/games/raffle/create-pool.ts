import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: "Method not allowed" });

    try {
        // 1. Create the new pool in the database
        const newPool = await prisma.rafflePool.create({
            data: {
                entryFee: 500, // Fixed fee for this tier
                status: 'OPEN',
                // Set expiry to 3 hours from now
                expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
            }
        });

        // 2. Return the pool so the frontend can immediately update the list
        return res.status(200).json({
            success: true,
            pool: newPool
        });

    } catch (error) {
        console.error("POOL_CREATION_ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to initialize new pool logic."
        });
    }
}