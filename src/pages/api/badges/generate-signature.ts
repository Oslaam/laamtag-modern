import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair } from '@metaplex-foundation/umi';

const prisma = global.prisma || new PrismaClient();

const RANK_HIERARCHY = [
    "Bronze",
    "Bronze Elite",
    "Silver",
    "Silver Elite",
    "Gold",
    "Gold Elite",
    "Platinum",
    "Diamond",
    "Legend",
    "Mythic",
    "Eternal",
    "Ascendant"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { walletAddress, requestedRank } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { walletAddress },
            include: {
                _count: {
                    select: {
                        quests: { where: { status: 'COMPLETED' } },
                        boosts: true
                    }
                }
            }
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        // --- SPECIAL LOGIC: BOOSTER ---
        if (requestedRank === "Booster") {
            const boostCount = user._count?.boosts ?? 0;
            if (boostCount < 10) {
                return res.status(403).json({ error: "Requirement not met: You need at least 10 purchased boosts." });
            }
        }
        // --- SPECIAL LOGIC: GAME MASTER ---
        else if (requestedRank === "Game Master") {
            const hasAllGames = user.hasPaidDiceEntry && user.hasResistanceUnlocked && user.hasPulseHunterUnlocked;
            if (!hasAllGames) {
                return res.status(403).json({ error: "Requirement not met: Unlock Dice, Resistance, and Pulse Hunter games." });
            }
        }
        // --- SPECIAL LOGIC: EARLY ADOPTER ---
        else if (requestedRank === "Early Adopter") {
            const meetsRequirements =
                user.username !== null &&
                user.lastCheckIn !== null &&
                user.personalMinted > 0 &&
                user.warriorMinted > 0 &&
                user.laamPoints >= 10000 &&
                user.tagTickets >= 100 &&
                (user._count?.quests ?? 0) >= 20 &&
                (user._count?.boosts ?? 0) > 0 &&
                user.hasPaidDiceEntry === true &&
                user.hasResistanceUnlocked === true &&
                user.hasPulseHunterUnlocked === true;

            if (!meetsRequirements) {
                return res.status(403).json({
                    error: "Criteria not met for Early Adopter Badge."
                });
            }
        }
        // --- SPECIAL LOGIC: GENESIS STAKER ---
        else if (requestedRank === "Genesis Staker") {
            if ((user.personalMinted || 0) < 3) {
                return res.status(403).json({
                    error: "You need at least 3 personal mints for this badge."
                });
            }
        }
        // --- SPECIAL LOGIC: WARRIOR CLAIMER ---
        else if (requestedRank === "Warrior Claimer") {
            if ((user.warriorMinted || 0) < 3) {
                return res.status(403).json({
                    error: "Criteria not met: You must have minted 3 Warriors to claim this badge."
                });
            }
        }
        // --- SPECIAL LOGIC: STREAK BADGES ---
        else if (requestedRank.includes("-Day Pulse")) {
            const requiredStreak = parseInt(requestedRank.split('-')[0]);
            if ((user.streakCount || 0) < requiredStreak) {
                return res.status(403).json({
                    error: `Requirement not met: You need a ${requiredStreak} day streak.`
                });
            }
        }
        // --- SPECIAL LOGIC: QUEST MASTER BADGES ---
        else if (requestedRank.includes("-Quest Master")) {
            const requiredQuests = parseInt(requestedRank.split('-')[0]);
            const completedCount = user._count?.quests ?? 0;

            if (completedCount < requiredQuests) {
                return res.status(403).json({
                    error: `Requirement not met: You need ${requiredQuests} completed quests.`
                });
            }
        }
        // --- SPECIAL LOGIC: SOCIAL LINK BADGES ---
        else if (requestedRank.includes("-Social Link")) {
            const requiredFriends = parseInt(requestedRank.split('-')[0]);

            const acceptedFriendsCount = await prisma.friendship.count({
                where: {
                    status: "ACCEPTED",
                    OR: [
                        { senderId: walletAddress },
                        { receiverId: walletAddress }
                    ]
                }
            });

            if (acceptedFriendsCount < requiredFriends) {
                return res.status(403).json({
                    error: `Requirement not met: You need ${requiredFriends} accepted friends.`
                });
            }
        }
        // --- STANDARD LOGIC: RANK HIERARCHY ---
        else if (RANK_HIERARCHY.includes(requestedRank)) {
            const userRankIndex = RANK_HIERARCHY.indexOf(user.rank);
            const requestedRankIndex = RANK_HIERARCHY.indexOf(requestedRank);

            if (userRankIndex < requestedRankIndex) {
                return res.status(403).json({
                    error: `You are ${user.rank}. Reach ${requestedRank} to mint.`
                });
            }
        }

        const RPC = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
        const umi = createUmi(RPC);
        const secretKey = JSON.parse(process.env.SIGNER_PRIVATE_KEY!);
        const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
        const signer = createSignerFromKeypair(umi, keypair);

        return res.status(200).json({
            success: true,
            signerAddress: signer.publicKey.toString()
        });

    } catch (error) {
        console.error("SIGNATURE_ERROR:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}