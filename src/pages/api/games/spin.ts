import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { logActivity } from '../../../lib/activityLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ error: "Wallet address required" });

    try {
        const user = await prisma.user.findUnique({ where: { walletAddress } });

        if (!user || user.tagTickets < 5) {
            return res.status(403).json({ error: 'Insufficient TAG. You need 5 TAG to spin.' });
        }

        const rewards = [
            { label: "1 TAG", type: "TAG", value: 1, chance: 13 },
            { label: "5 TAG", type: "TAG", value: 5, chance: 19 },
            { label: "50 L", type: "LAAM", value: 50, chance: 30 },
            { label: "100 L", type: "LAAM", value: 100, chance: 11.1 },
            { label: "500 L", type: "LAAM", value: 500, chance: 13.7 },
            { label: "1 USDC", type: "USDC", value: 1, chance: 0.1 },
            { label: "0.01 SOL", type: "SOL", value: 0.01, chance: 0.1 },
            { label: "EMPTY", type: "EMPTY", value: 0, chance: 9 },
            { label: "GEN BOX", type: "GEN_BOX", value: 0, chance: 0.1 },
            {
                label: "SPEC BOX",
                type: "SPEC_BOX",
                value: 0,
                // Only give a chance if they have 1000 total purchased, else 0%
                chance: (user.totalTagPurchased >= 1000) ? 1 : 0
            },
        ];

        if (user.totalTagPurchased >= 1000) {
            rewards.push({ label: "SPECIAL BOX", type: "SPEC_BOX", value: 0, chance: 3 });
        }

        const totalWeight = rewards.reduce((acc, r) => acc + r.chance, 0);
        let random = Math.random() * totalWeight;
        let segmentIndex = 0;

        for (let i = 0; i < rewards.length; i++) {
            if (random < rewards[i].chance) {
                segmentIndex = i;
                break;
            }
            random -= rewards[i].chance;
        }

        const win = rewards[segmentIndex];
        let finalRewardLabel = win.label;
        let finalValue = win.value;
        let finalAssetType = win.type;

        let updateUserData: any = { tagTickets: { decrement: 5 } };
        let pendingRewardData: any = null;

        // --- REWARD LOGIC ---
        if (win.type === "GEN_BOX" || win.type === "SPEC_BOX") {
            const items = win.type === "GEN_BOX"
                ? [{ l: "200 LAAM", v: 200, t: "L" }, { l: "1 USDC", v: 1, t: "U" }, { l: "0.01 SOL", v: 0.01, t: "S" }, { l: "10 TAG", v: 10, t: "T" }]
                : [{ l: "2000 LAAM", v: 2000, t: "L" }, { l: "100 TAG", v: 100, t: "T" }, { l: "0.05 SOL", v: 0.05, t: "S" }, { l: "5 USDC", v: 5, t: "U" }];

            const pick = items[Math.floor(Math.random() * items.length)];
            finalRewardLabel = pick.l;
            finalValue = pick.v;

            if (win.type === "SPEC_BOX") updateUserData.totalTagPurchased = { decrement: 1000 };

            if (pick.t === "L") {
                updateUserData.laamPoints = { increment: pick.v };
                finalAssetType = "LAAM";
            } else if (pick.t === "T") {
                updateUserData.tagTickets = { increment: pick.v };
                finalAssetType = "TAG";
            } else if (pick.t === "S" || pick.t === "U") {
                finalAssetType = pick.t === "S" ? "SOL" : "USDC";
                pendingRewardData = { asset: finalAssetType, amount: pick.v };
            }
        }
        else if (win.type === "LAAM") updateUserData.laamPoints = { increment: win.value };
        else if (win.type === "TAG") updateUserData.tagTickets = { increment: win.value };
        else if (win.type === "SOL" || win.type === "USDC") {
            pendingRewardData = { asset: win.type, amount: win.value };
        }

        // --- DATABASE TRANSACTION ---
        await prisma.$transaction(async (tx) => {
            // Deduct spin cost and add instant rewards (TAG/LAAM)
            await tx.user.update({ where: { walletAddress }, data: updateUserData });

            // Create claimable entry for SOL/USDC
            if (pendingRewardData) {
                await tx.pendingReward.create({
                    data: {
                        userId: walletAddress,
                        asset: pendingRewardData.asset,
                        amount: pendingRewardData.amount
                    }
                });
            }
        });

        // LOG HISTORY
        await logActivity(walletAddress, 'SPIN_COST', -5, 'TAG');
        if (finalValue > 0) {
            await logActivity(walletAddress, 'SPIN_WIN', finalValue, finalAssetType as any);
        }

        return res.status(200).json({
            segmentIndex,
            rewardLabel: finalRewardLabel,
            rewardType: win.type
        });

    } catch (error: any) {
        console.error("Spin Error:", error);
        return res.status(500).json({ error: "System Error: Spin could not be processed." });
    }
}