import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { walletAddress, actualCount, amountMinted } = req.body;

    if (walletAddress === undefined || actualCount === undefined) {
        return res.status(400).json({ error: "Missing parameters" });
    }

    try {
        // We use a transaction to ensure both User update and Activity creation happen together
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update the User's personal total
            const updatedUser = await tx.user.update({
                where: { walletAddress },
                data: {
                    personalMinted: actualCount,
                },
            });

            // 2. Create an Activity log for the ticker (only if items were actually minted)
            // Note: amountMinted should be passed from your frontend handleMint
            if (amountMinted && amountMinted > 0) {
                await tx.activity.create({
                    data: {
                        userId: walletAddress,
                        type: "GENESIS_MINT",
                        asset: "NFT",
                        amount: parseFloat(amountMinted),
                        // signature: "" // You could pass the tx hash here if you want
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