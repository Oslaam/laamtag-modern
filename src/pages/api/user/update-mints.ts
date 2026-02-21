import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { walletAddress, actualCount, amountMinted, type } = req.body;

    if (walletAddress === undefined || actualCount === undefined) {
        return res.status(400).json({ error: "Missing parameters" });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const updatedUser = await tx.user.update({
                where: { walletAddress },
                data: {
                    // ✅ Use type to target the right field
                    ...(type === 'warrior'
                        ? { warriorMinted: actualCount }
                        : { personalMinted: actualCount }
                    ),
                },
            });

            if (amountMinted && amountMinted > 0) {
                await tx.activity.create({
                    data: {
                        userId: walletAddress,
                        type: type === 'warrior' ? "WARRIOR_MINT" : "GENESIS_MINT",
                        asset: "NFT",
                        amount: parseFloat(amountMinted),
                    }
                });
            }

            return updatedUser;
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("Sync Error:", error);
        return res.status(500).json({ error: "Failed to sync mint and log activity" });
    }
}