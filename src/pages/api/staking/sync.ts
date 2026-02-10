import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { logActivity } from '../../../lib/activityLogger';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { walletAddress, signature, message } = req.body;

    if (!signature || !message || !walletAddress) {
        return res.status(401).json({ message: "Authentication required." });
    }

    try {
        const signatureUint8 = bs58.decode(signature);
        const messageUint8 = new TextEncoder().encode(message);
        const pubKeyUint8 = bs58.decode(walletAddress);

        const isVerified = nacl.sign.detached.verify(
            messageUint8,
            signatureUint8,
            pubKeyUint8
        );

        if (!isVerified) {
            return res.status(401).json({ message: "Security Breach: Invalid Signature." });
        }

        const stakedNfts = await prisma.stakedNFT.findMany({
            where: { ownerAddress: walletAddress }
        });

        if (stakedNfts.length === 0) return res.status(200).json({ message: "No NFTs staked." });

        const now = new Date();
        let totalLaamToDeposit = 0;
        let totalTagToDeposit = 0;

        const LAAM_PER_HOUR = 500 / 24;
        const TAG_PER_HOUR = 20 / 24;

        for (const nft of stakedNfts) {
            const nowTime = now.getTime();
            const stakedAtTime = new Date(nft.stakedAt).getTime();
            const lastClaimedTime = new Date(nft.lastClaimed).getTime();

            // 1. Initial 48h Warm-up check
            const hoursSinceStaked = (nowTime - stakedAtTime) / (1000 * 60 * 60);
            if (hoursSinceStaked < 48) continue;

            // 2. Calculate TOTAL time passed since the last successful claim (No Loss Math)
            const hoursSinceLastSync = (nowTime - lastClaimedTime) / (1000 * 60 * 60);

            // 3. User can claim as long as at least 24h has passed since last claim
            if (hoursSinceLastSync >= 24) {
                const activeBoost = await prisma.multiplierBoost.findFirst({
                    where: {
                        mintAddress: nft.mintAddress,
                        activatedAt: { lte: now },
                        expiresAt: { gt: now }
                    },
                    orderBy: { multiplier: 'desc' }
                });

                const multiplier = activeBoost ? activeBoost.multiplier : 1;

                // 4. ACCUMULATION LOGIC: Multiply hourly rate by the TOTAL elapsed hours
                const nftLaamReward = (LAAM_PER_HOUR * hoursSinceLastSync) * multiplier;
                const nftTagReward = (TAG_PER_HOUR * hoursSinceLastSync) * multiplier;

                totalLaamToDeposit += nftLaamReward;
                totalTagToDeposit += nftTagReward;

                // 5. Update the NFT's lastClaimed to NOW
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
                    laamPoints: { increment: totalLaamToDeposit },
                    tagTickets: { increment: totalTagToDeposit }
                }
            });

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