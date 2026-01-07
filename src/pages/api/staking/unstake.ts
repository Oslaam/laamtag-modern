import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();
    const { walletAddress, mintAddress } = req.body;

    const LAAM_PER_SEC = 500 / 86400;
    const TAG_PER_SEC = 10 / 86400;

    try {
        const stake = await prisma.stakedNFT.findFirst({
            where: { mintAddress, ownerAddress: walletAddress }
        });

        if (!stake) return res.status(404).json({ success: false, message: "Stake record not found." });

        const now = Date.now();
        const stakedAt = new Date(stake.stakedAt).getTime();
        const secondsElapsed = Math.floor((now - stakedAt) / 1000);

        // 1. Calculate Rewards
        const calculatedLaam = secondsElapsed * LAAM_PER_SEC;
        const calculatedTag = secondsElapsed * TAG_PER_SEC;

        // 2. Cooldown check (48h)
        if (now - stakedAt < 48 * 60 * 60 * 1000) {
            return res.status(403).json({ success: false, message: "Cooldown active." });
        }

        // 3. Transaction: Create History & Delete Stake
        await prisma.$transaction([
            prisma.rewardHistory.create({
                data: {
                    walletAddress: walletAddress,
                    mintAddress: mintAddress,
                    laamEarned: calculatedLaam,
                    tagEarned: calculatedTag,
                }
            }),
            prisma.stakedNFT.delete({ where: { mintAddress } })
        ]);

        return res.status(200).json({ success: true, laam: calculatedLaam, tag: calculatedTag });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to process unstake." });
    }
}