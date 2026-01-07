import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { logActivity } from '../../../lib/activityLogger'; // Import the logger

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { walletAddress, amount, price } = req.body;

    if (!walletAddress || !amount || !price) {
        return res.status(400).json({ message: 'Missing data (address, amount, or price)' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { walletAddress } });

        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.laamPoints < price) {
            return res.status(400).json({ message: `Insufficient LAAM. Need ${price}, you have ${user.laamPoints}` });
        }

        // 2. Atomic update: Deduct points and add tickets
        const updatedUser = await prisma.user.update({
            where: { walletAddress },
            data: {
                laamPoints: { decrement: price },
                tagTickets: { increment: amount }
            }
        });

        // --- NEW: LOG TO HISTORY ---
        // Log the spent LAAM
        await logActivity(walletAddress, 'SHOP_PURCHASE', -price, 'LAAM');
        // Log the received TAGS
        await logActivity(walletAddress, 'SHOP_PURCHASE', amount, 'TAG');

        return res.status(200).json({
            success: true,
            newBalance: updatedUser.tagTickets,
            newPoints: updatedUser.laamPoints
        });
    } catch (error) {
        console.error("Shop Error:", error);
        return res.status(500).json({ message: 'Failed to process purchase' });
    }
}