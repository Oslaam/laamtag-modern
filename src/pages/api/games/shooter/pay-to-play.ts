import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { logActivity } from '../../../../lib/activityLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { walletAddress } = req.body;
    const PLAY_COST = 5;

    if (!walletAddress) return res.status(400).json({ error: "Wallet address required" });

    try {
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { walletAddress } });

            if (!user) throw new Error("USER_NOT_FOUND");

            if (user.tagTickets < PLAY_COST) {
                throw new Error("INSUFFICIENT_FUNDS");
            }

            // Deduct the 5 TAG
            const updatedUser = await tx.user.update({
                where: { walletAddress },
                data: {
                    tagTickets: { decrement: PLAY_COST }
                }
            });

            // Log the activity so it shows up in their history
            await logActivity(walletAddress, 'GAME_START_FEE', -PLAY_COST, 'TAG');

            return {
                success: true,
                remainingTag: updatedUser.tagTickets
            };
        });

        return res.status(200).json(result);

    } catch (error: any) {
        console.error("Payment Error:", error.message);
        const status = error.message === "INSUFFICIENT_FUNDS" ? 403 : 500;
        return res.status(status).json({
            error: error.message === "INSUFFICIENT_FUNDS" ? "You need 5 TAG to play!" : "Transaction failed"
        });
    }
}