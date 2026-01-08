import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { logActivity } from '../../../lib/activityLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();
    const { walletAddress } = req.body;

    try {
        const stakedNfts = await prisma.stakedNFT.findMany({
            where: { ownerAddress: walletAddress }
        });

        if (stakedNfts.length === 0) return res.status(200).json({ message: "No NFTs staked." });

        const now = new Date();
        let totalLaamToDeposit = 0;
        let totalTagToDeposit = 0;

        // Reward Rates per NFT per 24h
        const LAAM_DAILY = 500;
        const TAG_DAILY = 20;

        for (const nft of stakedNfts) {
            // 1. THE 48H RULE: No rewards until the NFT has been locked for 2 days (48 hours)
            const hoursSinceStaked = (now.getTime() - new Date(nft.stakedAt).getTime()) / (1000 * 60 * 60);
            if (hoursSinceStaked < 48) continue;

            // 2. DAILY CALCULATION: Check full 24h cycles since lastClaimed
            const lastSync = new Date(nft.lastClaimed);
            const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
            const daysElapsed = Math.floor(hoursSinceLastSync / 24);

            if (daysElapsed >= 1) {
                // Calculate rewards for this specific NFT based on elapsed days
                const nftLaamReward = LAAM_DAILY * daysElapsed;
                const nftTagReward = TAG_DAILY * daysElapsed;

                totalLaamToDeposit += nftLaamReward;
                totalTagToDeposit += nftTagReward;

                // Update this NFT's lastClaimed so they can't claim these days again
                await prisma.stakedNFT.update({
                    where: { mintAddress: nft.mintAddress },
                    data: { lastClaimed: now }
                });
            }
        }

        // 3. Update User Balance if rewards were earned
        if (totalLaamToDeposit > 0 || totalTagToDeposit > 0) {
            await prisma.user.update({
                where: { walletAddress },
                data: {
                    laamPoints: { increment: totalLaamToDeposit },
                    tagTickets: { increment: Math.floor(totalTagToDeposit) }
                }
            });

            // Log the activity for transparency
            if (totalLaamToDeposit > 0) {
                await logActivity(walletAddress, 'STAKING_REWARD' as any, totalLaamToDeposit, 'LAAM');
            }
            if (totalTagToDeposit > 0) {
                await logActivity(walletAddress, 'STAKING_REWARD' as any, totalTagToDeposit, 'TAG');
            }
        }

        return res.status(200).json({
            depositedLaam: totalLaamToDeposit,
            depositedTag: totalTagToDeposit
        });

    } catch (error) {
        console.error("Sync Error:", error);
        return res.status(500).json({ message: "Internal Security Error" });
    }
}