import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { adminAddress, targetAddress, type, message } = req.body;

    // Check if the sender is actually an admin
    const ADMIN_WALLETS = [
        "E4cHwRYWTznNjTvchSkZVXH8LWqdWbLekVXWjzmite6M",
        "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc"
    ];

    if (!ADMIN_WALLETS.includes(adminAddress)) {
        return res.status(403).json({ error: "UNAUTHORIZED_OPERATOR" });
    }

    try {
        await prisma.notification.create({
            data: {
                userId: targetAddress, // User receiving the alert
                type: type,            // 'SYSTEM_NEWS' or 'ADMIN_ADJUST'
                message: message,
                fromAddress: adminAddress,
                isRead: false
            }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "BROADCAST_FAILED" });
    }
}