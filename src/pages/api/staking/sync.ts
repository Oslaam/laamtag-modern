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

        for (const nft of stakedNfts) {
            const hoursSinceStaked = (now.getTime() - new Date(nft.stakedAt).getTime()) / (1000 * 60 * 60);
            if (hoursSinceStaked < 48) continue;

            const lastSync = new Date(nft.lastClaimed);
            const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
            const daysElapsed = Math.floor(hoursSinceLastSync / 24);

            if (daysElapsed >= 1) {
                const count = stakedNfts.length;
                const laamRate = count === 1 ? 500 : count === 2 ? 1000 : 1500;
                const tagRate = count === 1 ? 20 : count === 2 ? 40 : 60;

                totalLaamToDeposit += (laamRate / count) * daysElapsed;
                totalTagToDeposit += (tagRate / count) * daysElapsed;

                await prisma.stakedNFT.update({
                    where: { mintAddress: nft.mintAddress },
                    data: { lastClaimed: now }
                });
            }
        }

        if (totalLaamToDeposit > 0 || totalTagToDeposit > 0) {
            await prisma.user.update({
                where: { walletAddress },
                data: {
                    laamPoints: { increment: totalLaamToDeposit },
                    tagTickets: { increment: Math.floor(totalTagToDeposit) }
                }
            });

            // LOG HISTORY
            if (totalLaamToDeposit > 0) await logActivity(walletAddress, 'STAKING_REWARD' as any, totalLaamToDeposit, 'LAAM');
            if (totalTagToDeposit > 0) await logActivity(walletAddress, 'STAKING_REWARD' as any, totalTagToDeposit, 'TAG');
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