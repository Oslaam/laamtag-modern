import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

const ADMIN_WALLETS = [
    "E4cHwRYWTznNjTvchSkZVXH8LWqdWbLekVXWjzmite6M",
    "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const adminWallet = req.headers['x-admin-wallet'] as string;

    if (!adminWallet || !ADMIN_WALLETS.includes(adminWallet)) {
        return res.status(401).json({ error: "UNAUTHORIZED_ACCESS" });
    }

    try {
        // Fetch pools that are no longer OPEN (LOCKED, DRAWN, or EXPIRED)
        const history = await prisma.rafflePool.findMany({
            where: {
                status: {
                    in: ['LOCKED', 'DRAWN', 'EXPIRED']
                }
            },
            orderBy: {
                updatedAt: 'desc'
            },
            include: {
                entries: true // To count participants
            },
            take: 20 // Limit to last 20 for performance
        });

        return res.status(200).json({ history });
    } catch (error) {
        console.error("Raffle history fetch error:", error);
        return res.status(500).json({ error: "FAILED_TO_FETCH_HISTORY" });
    }
}