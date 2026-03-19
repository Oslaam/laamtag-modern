import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = global.prisma || new PrismaClient();

const RANK_HIERARCHY = ["Bronze", "Bronze Elite", "Silver", "Silver Elite", "Gold", "Gold Elite", "Platinum", "Diamond", "Legend", "Mythic", "Eternal", "Ascendant"];


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { walletAddress, signature } = req.body;
    const badgeRank = req.body.badgeRank?.trim();

    if (!badgeRank) return res.status(400).json({ error: "Badge rank is required" });

    try {
        const user = await prisma.user.findUnique({
            where: { walletAddress },
            include: {
                _count: {
                    select: {
                        quests: { where: { status: 'COMPLETED' } },
                        boosts: true,
                        friendsSent: true,
                        friendsReceived: true
                    }
                }
            }
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        let isEligible = false;
        const qCount = user._count?.quests ?? 0;

        if (badgeRank === "Early Adopter") {
            isEligible = !!(
                user.username &&
                user.laamPoints >= 10000 &&
                user.tagTickets >= 100 &&
                user.hasPaidDiceEntry &&
                user.hasResistanceUnlocked &&
                user.hasPulseHunterUnlocked &&
                user.hasPlinkoUnlocked &&
                user.personalMinted > 0 &&
                user.warriorMinted > 0 &&
                qCount >= 20
            );
        } else if (badgeRank === "Game Master") {
            isEligible = !!(
                user.hasPaidDiceEntry &&
                user.hasResistanceUnlocked &&
                user.hasPulseHunterUnlocked &&
                user.hasPlinkoUnlocked
            );
        } else if (badgeRank === "Booster") {
            isEligible = (user._count?.boosts ?? 0) >= 10;
        } else if (RANK_HIERARCHY.includes(badgeRank)) {
            isEligible = RANK_HIERARCHY.indexOf(user.rank) >= RANK_HIERARCHY.indexOf(badgeRank);
        } else {
            isEligible = true;
        }

        if (!isEligible) return res.status(403).json({ error: "Requirements not met for this badge." });

        // 2. Use the sanitized badgeRank for upsert
        const badge = await prisma.badge.upsert({
            where: { name: badgeRank },
            update: {},
            create: {
                name: badgeRank,
                minPoints: 0,
                cmId: "OFF_CHAIN",
                collectionId: "BADGES"
            }
        });

        // 3. Atomic Transaction
        await prisma.$transaction([
            prisma.activity.create({
                data: { userId: walletAddress, type: "BADGE_CLAIM", asset: "SKR", amount: 10, signature }
            }),
            prisma.userBadge.create({
                data: { userId: walletAddress, badgeId: badge.id, signature }
            })
        ]);

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error("Verification Error:", error);
        if (error.code === 'P2002') return res.status(400).json({ error: "Badge already claimed." });
        return res.status(500).json({ error: "Internal Server Error" });
    }
}