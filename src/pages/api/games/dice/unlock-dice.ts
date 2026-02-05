import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    const { walletAddress, signature } = req.body;

    if (!walletAddress) {
        return res.status(400).json({ error: "Missing wallet address" });
    }

    try {
        // MINTING PATTERN: Just like your update-mints.ts
        // We use upsert to ensure we create the user if they don't exist yet
        const updatedUser = await prisma.user.upsert({
            where: { walletAddress },
            update: {
                hasPaidDiceEntry: true,
            },
            create: {
                walletAddress,
                hasPaidDiceEntry: true,
                tagTickets: 50, // Starter tickets for new users
            }
        });

        // Log to activity table just like reward-nft.ts
        await prisma.activity.create({
            data: {
                userId: walletAddress,
                type: 'DICE_UNLOCK',
                asset: 'SKR',
                amount: 200,
                signature: typeof signature === 'string' ? signature : JSON.stringify(signature)
            }
        });

        return res.status(200).json({ success: true, user: updatedUser });

    } catch (error: any) {
        console.error("DICE_UNLOCK_ERROR:", error);
        return res.status(500).json({ error: "Failed to unlock dice module" });
    }
}