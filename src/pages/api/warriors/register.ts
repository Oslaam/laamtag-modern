import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { mintAddress, walletAddress, rarity, signature, image } = req.body; // Added image here

    try {
        const warrior = await prisma.deployedWarrior.create({
            data: {
                mintAddress,
                ownerAddress: walletAddress,
                rarity: rarity || "Common",
                image: image,
                status: 'IDLE',
            }
        });

        await prisma.activity.create({
            data: {
                userId: walletAddress,
                type: "WARRIOR_DEPOSIT",
                asset: "NFT",
                amount: 1,
                signature: signature
            }
        });

        return res.status(200).json({ success: true, warrior });
    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({ error: "Failed to register warrior." });
    }
}