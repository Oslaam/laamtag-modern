import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair } from '@metaplex-foundation/umi';

const prisma = global.prisma || new PrismaClient();

const RANK_HIERARCHY = [
    "Bronze", "Bronze Elite", "Silver", "Silver Elite", "Gold", "Gold Elite",
    "Platinum", "Diamond", "Legend", "Mythic", "Eternal", "Ascendant"
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

        // --- REQUIREMENT LOGIC ---
        if (requestedRank === "Booster") {
            if ((user._count?.boosts ?? 0) < 10) return res.status(403).json({ error: "Need 10 purchased boosts." });
        }
        else if (requestedRank === "Game Master") {
            const hasAllGames = user.hasPaidDiceEntry && user.hasResistanceUnlocked && user.hasPulseHunterUnlocked;
            if (!hasAllGames) return res.status(403).json({ error: "Unlock Dice, Resistance, and Pulse Hunter." });
        }
        else if (requestedRank === "Early Adopter") {
            const meetsReq = user.username && user.laamPoints >= 10000 && user.tagTickets >= 100 &&
                user.hasPaidDiceEntry && user.hasResistanceUnlocked && user.hasPulseHunterUnlocked &&
                user.personalMinted > 0 && user.warriorMinted > 0 && (user._count?.quests ?? 0) >= 20;
            if (!meetsReq) return res.status(403).json({ error: "Criteria not met for Early Adopter." });
        }
        else if (RANK_HIERARCHY.includes(requestedRank)) {
            const userRankIndex = RANK_HIERARCHY.indexOf(user.rank);
            const reqRankIndex = RANK_HIERARCHY.indexOf(requestedRank);
            if (userRankIndex < reqRankIndex) return res.status(403).json({ error: `Reach ${requestedRank} to mint.` });
        }

        // --- GENERATE SIGNER ---
        const umi = createUmi("https://mainnet.helius-rpc.com/?api-key=YOUR_KEY");
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