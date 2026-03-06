import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();
    const { mintAddress, walletAddress, sector } = req.body;

    try {
        const cost = sector === 'NORMAL' ? 500 : 0;

        // 1. Check if the warrior is actually in the barracks (IDLE)
        const warrior = await prisma.deployedWarrior.findUnique({
            where: { mintAddress }
        });

        if (!warrior || warrior.status !== 'IDLE') {
            return res.status(400).json({ error: "Warrior is not in Barracks or already deployed." });
        }

        await prisma.$transaction([
            // Deduct TAG if applicable
            prisma.user.update({
                where: { walletAddress },
                data: { tagTickets: { decrement: cost } }
            }),
            // Set to DEPLOYED (Unavailable)
            prisma.deployedWarrior.update({
                where: { mintAddress },
                data: {
                    status: 'DEPLOYED',
                    location: sector,
                    missionEnd: new Date(Date.now() + 24 * 60 * 60 * 1000)
                }
            })
        ]);

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Mission deployment failed" });
    }
}