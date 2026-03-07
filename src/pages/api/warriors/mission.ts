import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();
    const { mintAddress, walletAddress, sector } = req.body;

    try {
        const cost = sector === 'NORMAL' ? 100 : 0;

        // 1. Fetch the user to check their balance first
        const user = await prisma.user.findUnique({
            where: { walletAddress }
        });

        if (!user || (sector === 'NORMAL' && user.tagTickets < cost)) {
            return res.status(400).json({ error: "Insufficient TAG Tickets." });
        }

        // 2. Check if the warrior is IDLE (Keep your existing check)
        const warrior = await prisma.deployedWarrior.findUnique({
            where: { mintAddress }
        });

        if (!warrior || warrior.status !== 'IDLE') {
            return res.status(400).json({ error: "Warrior is not ready." });
        }

        // 3. Run the transaction
        await prisma.$transaction([
            prisma.user.update({
                where: { walletAddress },
                data: { tagTickets: { decrement: cost } }
            }),
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