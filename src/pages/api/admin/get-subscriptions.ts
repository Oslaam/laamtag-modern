import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_WALLETS = [
    "E4cHwRYWTznNjTvchSkZVXH8LWqdWbLekVXWjzmite6M",
    "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const adminWallet = req.headers['x-admin-wallet'] as string;

    if (!adminWallet || !ADMIN_WALLETS.includes(adminWallet)) {
        return res.status(403).json({ message: "UNAUTHORIZED_ACCESS" });
    }

    try {
        const subs = await prisma.pushSubscription.findMany({
            select: {
                subscription: true,
                walletAddress: true
            }
        });
        return res.status(200).json(subs);
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch subscribers" });
    }
}