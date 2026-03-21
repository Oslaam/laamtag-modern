import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

const RANK_HIERARCHY = [
    "Bronze", "Bronze Elite", "Silver", "Silver Elite", "Gold", "Gold Elite",
    "Platinum", "Diamond", "Legend", "Mythic", "Eternal", "Ascendant"
];

const STREAK_BADGES: Record<string, number> = {
    "10-Day Pulse": 10,
    "30-Day Pulse": 30,
    "50-Day Pulse": 50,
    "100-Day Pulse": 100,
};

const QUEST_BADGES: Record<string, number> = {
    "30-Quest Master": 30,
    "50-Quest Master": 50,
    "100-Quest Master": 100,
};

const SOCIAL_BADGES: Record<string, number> = {
    "20-Social Link": 20,
    "30-Social Link": 30,
    "50-Social Link": 50,
    "100-Social Link": 100,
};

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
                        // Only count COMPLETED quests
                        quests: { where: { status: 'APPROVED' } },
                        boosts: true,
                    }
                }
            }
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        // Fetch accepted friends count separately (same as [address].ts)
        const friendsCount = await prisma.friendship.count({
            where: {
                status: "ACCEPTED",
                OR: [
                    { senderId: walletAddress },
                    { receiverId: walletAddress }
                ]
            }
        });

        const completedQuests = user._count?.quests ?? 0;
        const boostsCount = user._count?.boosts ?? 0;

        let isEligible = false;

        if (badgeRank === "Early Adopter") {
            isEligible = !!(
                user.username &&
                user.laamPoints >= 10000 &&
                user.hasPaidDiceEntry &&
                user.hasResistanceUnlocked &&
                user.hasPulseHunterUnlocked &&
                user.hasPlinkoUnlocked &&
                completedQuests >= 20
            );
        } else if (badgeRank === "Game Master") {
            isEligible = !!(
                user.hasPaidDiceEntry &&
                user.hasResistanceUnlocked &&
                user.hasPulseHunterUnlocked &&
                user.hasPlinkoUnlocked
            );
        } else if (badgeRank === "Booster") {
            isEligible = boostsCount >= 10;
        } else if (badgeRank === "Warrior Claimer") {
            isEligible = (user.warriorMinted || 0) >= 5;
        } else if (badgeRank === "Genesis Staker") {
            isEligible = (user.personalMinted || 0) >= 3;
        } else if (RANK_HIERARCHY.includes(badgeRank)) {
            // Rank badges
            isEligible = RANK_HIERARCHY.indexOf(user.rank) >= RANK_HIERARCHY.indexOf(badgeRank);
        } else if (STREAK_BADGES[badgeRank] !== undefined) {
            // Streak badges
            isEligible = (user.streakCount || 0) >= STREAK_BADGES[badgeRank];
        } else if (QUEST_BADGES[badgeRank] !== undefined) {
            // Quest badges
            isEligible = completedQuests >= QUEST_BADGES[badgeRank];
        } else if (SOCIAL_BADGES[badgeRank] !== undefined) {
            // Social badges
            isEligible = friendsCount >= SOCIAL_BADGES[badgeRank];
        } else {
            isEligible = true;
        }

        if (!isEligible) {
            return res.status(403).json({ error: "Requirements not met for this badge." });
        }

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

        await prisma.$transaction([
            prisma.activity.create({
                data: {
                    userId: walletAddress,
                    type: "BADGE_CLAIM",
                    asset: "SKR",
                    amount: 50,
                    signature
                }
            }),
            prisma.userBadge.create({
                data: {
                    userId: walletAddress,
                    badgeId: badge.id,
                    signature
                }
            })
        ]);

        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error("Verification Error:", error);
        if (error.code === 'P2002') return res.status(400).json({ error: "Badge already claimed." });
        return res.status(500).json({ error: "Internal Server Error" });
    }
}