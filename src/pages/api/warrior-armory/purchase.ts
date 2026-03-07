import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import armoryData from '../../../lib/armory.json'; // Import the source of truth

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    try {
        const { itemId, address, category } = req.body;

        // 1. Server-side validation
        const categoryItems = armoryData[category as keyof typeof armoryData];
        const officialItem = categoryItems?.find(i => i.id === itemId);

        if (!officialItem) {
            return res.status(400).json({ error: "Invalid item or category" });
        }

        const cost = officialItem.cost; // Use the JSON cost, ignore the body cost

        // 2. Check User existence and balance
        const user = await prisma.user.findUnique({
            where: { walletAddress: address }
        });

        if (!user) return res.status(404).json({ error: "User not found" });
        if (user.warCredits < cost) return res.status(400).json({ error: "Insufficient War Credits" });

        // 3. Atomic Transaction
        await prisma.$transaction([
            prisma.user.update({
                where: { walletAddress: address },
                data: { warCredits: { decrement: cost } }
            }),
            prisma.warriorInventory.create({
                data: {
                    walletAddress: address,
                    itemId: itemId,
                    category: category
                }
            }),
            prisma.activity.create({
                data: {
                    userId: address,
                    type: 'ARMORY_PURCHASE',
                    asset: 'WAR_CREDITS',
                    amount: -cost,
                }
            })
        ]);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Purchase Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}