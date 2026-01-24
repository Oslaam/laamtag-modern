import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { isWalletAdmin } from '../../../lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    const { adminWallet, targetWallet, amount } = req.body;

    // Use the faster helper instead of a DB query
    if (!isWalletAdmin(adminWallet)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        await prisma.user.update({
            where: { walletAddress: targetWallet },
            data: { tagTickets: { increment: parseInt(amount) } }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Giveaway error:", error);
        return res.status(500).json({ error: "Failed to update user tickets" });
    }
}