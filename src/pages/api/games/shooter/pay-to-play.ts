import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { logActivity } from '../../../../lib/activityLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { walletAddress, reason = 'GAME_START_FEE' } = req.body;
    const PLAY_COST = 5;

    if (!walletAddress) return res.status(400).json({ error: "Wallet address required" });

    try {
        const user = await prisma.user.findUnique({ where: { walletAddress } });

        if (!user) return res.status(404).json({ error: "User not found" });
        if (user.tagTickets < PLAY_COST) return res.status(403).json({ error: "You need 5 TAG to play!" });

        // ── Sequential writes — no transaction needed ──
        const updatedUser = await prisma.user.update({
            where: { walletAddress },
            data: { tagTickets: { decrement: PLAY_COST } }
        });

        await logActivity(walletAddress, reason as any, -PLAY_COST, 'TAG');

        return res.status(200).json({
            success: true,
            remainingTag: updatedUser.tagTickets
        });

    } catch (error: any) {
        console.error("Payment Error:", error.message);
        return res.status(500).json({ error: "Transaction failed" });
    }
}