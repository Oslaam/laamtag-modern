import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { logActivity } from '../../../lib/activityLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { walletAddress, amount, price, signature } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { walletAddress } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // LOGIC: If price is > 0, they are paying with LAAM. 
        // If price is 0, we assume they paid via SOL (verified by signature on frontend).
        if (price > 0 && user.laamPoints < price) {
            return res.status(400).json({ message: 'Insufficient LAAM' });
        }

        const updatedUser = await prisma.user.update({
            where: { walletAddress },
            data: {
                laamPoints: price > 0 ? { decrement: price } : undefined,
                tagTickets: { increment: amount },
                totalTagPurchased: { increment: amount } // Keep track of this for Special Boxes!
            }
        });

        // Log the event
        if (price > 0) await logActivity(walletAddress, 'SHOP_PURCHASE', -price, 'LAAM');
        await logActivity(walletAddress, 'SHOP_PURCHASE', amount, 'TAG');

        return res.status(200).json({ success: true, newBalance: updatedUser.tagTickets });
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}