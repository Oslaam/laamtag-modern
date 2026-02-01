import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { logActivity } from '../../../lib/activityLogger';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    // 1. Extract wallet, signature, and message from body for security verification
    const { walletAddress, signature, message } = req.body;

    if (!signature || !message || !walletAddress) {
        return res.status(401).json({ message: "Authentication required." });
    }

    try {
        // 2. VERIFY THE SIGNATURE (Security Fix)
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

        // --- AUTHENTICATED LOGIC BELOW ---
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
            const hoursSinceStaked = (now.getTime() - new Date(nft.stakedAt).getTime()) / (1000 * 60 * 60);

            // Only proceed if staked for at least 48 hours
            if (hoursSinceStaked < 48) continue;

            const lastSync = new Date(nft.lastClaimed);
            const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

            // ONLY proceed if the 24h cycle is complete
            if (hoursSinceLastSync >= 24) {
                // Find the boost that is active RIGHT NOW for this NFT
                const activeBoost = await prisma.multiplierBoost.findFirst({
                    where: {
                        mintAddress: nft.mintAddress,
                        activatedAt: { lte: now }, // Must have already started
                        expiresAt: { gt: now }      // Must not have ended yet
                    },
                    orderBy: { multiplier: 'desc' } // Best one first if overlap
                });

                const multiplier = activeBoost ? activeBoost.multiplier : 1;

                // Calculate rewards USING the multiplier
                const nftLaamReward = (LAAM_PER_HOUR * hoursSinceLastSync) * multiplier;
                const nftTagReward = (TAG_PER_HOUR * hoursSinceLastSync) * multiplier;

                totalLaamToDeposit += nftLaamReward;
                totalTagToDeposit += nftTagReward;

                // Update DB for this specific NFT
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

        // Update the User profile if rewards were earned
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