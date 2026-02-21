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
            // 1. GET THE CURRENT COUNTS FROM DB
            const user = await tx.user.findUnique({
                where: { walletAddress },
                select: { personalMinted: true, warriorMinted: true }
            });

            if (!user) throw new Error("User not found");

            // 2. PREPARE THE DATA (Only update if the NEW count is HIGHER than the DB count)
            const updateData: any = {};

            if (type === 'warrior') {
                if (actualCount > user.warriorMinted) {
                    updateData.warriorMinted = actualCount;
                }
            } else {
                // This targets 'genesis' or default
                if (actualCount > user.personalMinted) {
                    updateData.personalMinted = actualCount;
                }
            }

            // 3. ONLY UPDATE IF THERE IS NEWER/HIGHER DATA
            let finalUser = user;
            if (Object.keys(updateData).length > 0) {
                finalUser = await tx.user.update({
                    where: { walletAddress },
                    data: updateData
                });
            }

            // 4. LOG ACTIVITY (Only if this was a fresh mint call)
            if (amountMinted && amountMinted > 0) {
                await tx.activity.create({
                    data: {
                        userId: walletAddress,
                        type: type === 'warrior' ? "WARRIOR_MINT" : "GENESIS_MINT",
                        asset: "NFT",
                        amount: parseFloat(amountMinted) || 0,
                    }
                });
            }

            return finalUser;
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("Sync Error:", error);
        return res.status(500).json({ error: "Failed to sync" });
    }
}