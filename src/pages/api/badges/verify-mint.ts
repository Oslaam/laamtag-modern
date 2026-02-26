import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { walletAddress, signature, badgeRank } = req.body;

    try {
        // 1. Find or Create the Badge in the DB so we can link to it
        // We use 'upsert' so if the badge doesn't exist yet, it creates it
        const badge = await prisma.badge.upsert({
            where: { name: badgeRank },
            update: {}, // Don't change anything if it exists
            create: {
                name: badgeRank,
                minPoints: 0, // You can update these later
                cmId: "DYNAMIC",
                collectionId: "DYNAMIC"
            }
        });

        // 2. Use a Transaction to save the activity AND the ownership record
        await prisma.$transaction([
            // Record the activity log
            prisma.activity.create({
                data: {
                    userId: walletAddress,
                    type: "BADGE_MINT",
                    asset: "SOL",
                    amount: 0.02,
                    signature: signature,
                }
            }),

            // Link the Badge to the User (The "Receipt")
            prisma.userBadge.create({
                data: {
                    userId: walletAddress,
                    badgeId: badge.id,
                    signature: signature
                }
            })
        ]);

        return res.status(200).json({ success: true });
    } catch (error: any) {
        // If they already claimed this badge, Prisma will throw a P2002 error
        if (error.code === 'P2002') {
            return res.status(400).json({ error: "You have already claimed this badge record." });
        }
        console.error("VERIFY_ERROR:", error);
        return res.status(500).json({ error: "Failed to record badge claim" });
    }
}