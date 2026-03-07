import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: "Address required" });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { walletAddress: address },
            include: { warriorItems: true } // Pulls the inventory
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        return res.status(200).json({
            balance: user.warCredits,
            ownedItemIds: user.warriorItems.map(item => item.itemId)
        });
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch armory data" });
    }
}