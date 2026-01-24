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

        // Daily rates divided by 24 to get Hourly rates
        const LAAM_PER_HOUR = 500 / 24;
        const TAG_PER_HOUR = 20 / 24;

        for (const nft of stakedNfts) {
            const hoursSinceStaked = (now.getTime() - new Date(nft.stakedAt).getTime()) / (1000 * 60 * 60);

            // Still check the 48h initial lock
            if (hoursSinceStaked < 48) continue;

            const lastSync = new Date(nft.lastClaimed);
            const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

            // Requirement: At least 24h must pass since last claim to trigger a sync
            if (hoursSinceLastSync >= 24) {
                // Calculate rewards based on exact hours (e.g., 25.5 hours)
                const nftLaamReward = LAAM_PER_HOUR * hoursSinceLastSync;
                const nftTagReward = TAG_PER_HOUR * hoursSinceLastSync;

                totalLaamToDeposit += nftLaamReward;
                totalTagToDeposit += nftTagReward;

                await prisma.stakedNFT.update({
                    where: { mintAddress: nft.mintAddress },
                    data: { lastClaimed: now }
                });

                await prisma.rewardHistory.create({
                    data: {
                        walletAddress: walletAddress,
                        mintAddress: nft.mintAddress,
                        laamEarned: nftLaamReward,
                        tagEarned: nftTagReward,
                        unstakedAt: now
                    }
                });
            }
        }

        if (totalLaamToDeposit > 0 || totalTagToDeposit > 0) {
            await prisma.user.update({
                where: { walletAddress },
                data: {
                    // Precision saved here. 
                    // UI handles Math.floor so user only sees whole numbers.
                    laamPoints: { increment: totalLaamToDeposit },
                    tagTickets: { increment: totalTagToDeposit }
                }
            });

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