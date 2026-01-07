import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { walletAddress } = req.body;

    try {
        // 1. Fetch all staked NFTs for this user
        const stakedNfts = await prisma.stakedNFT.findMany({
            where: { ownerAddress: walletAddress }
        });

        if (stakedNfts.length === 0) return res.status(200).json({ message: "No NFTs staked." });

        const now = new Date();
        let totalLaamToDeposit = 0;
        let totalTagToDeposit = 0;

        // 2. Calculate rewards per NFT
        for (const nft of stakedNfts) {
            const hoursSinceStaked = (now.getTime() - new Date(nft.stakedAt).getTime()) / (1000 * 60 * 60);

            // Enforce 48-hour cooldown
            if (hoursSinceStaked < 48) continue;

            // Calculate days since last sync/deposit
            const lastSync = new Date(nft.lastClaimed); // We use this field as 'lastSync'
            const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
            const daysElapsed = Math.floor(hoursSinceLastSync / 24);

            if (daysElapsed >= 1) {
                // Multiplier logic based on total staked count
                const count = stakedNfts.length;
                const laamRate = count === 1 ? 500 : count === 2 ? 1000 : 1500;
                const tagRate = count === 1 ? 20 : count === 2 ? 40 : 60;

                // Add to deposit pool (Divided by count to avoid tripling the reward per NFT)
                totalLaamToDeposit += (laamRate / count) * daysElapsed;
                totalTagToDeposit += (tagRate / count) * daysElapsed;

                // Update the 'lastClaimed' timestamp for this NFT so they can't claim twice
                await prisma.stakedNFT.update({
                    where: { mintAddress: nft.mintAddress },
                    data: { lastClaimed: now }
                });
            }
        }

        // 3. SECURE DEPOSIT: Update User Balance
        if (totalLaamToDeposit > 0 || totalTagToDeposit > 0) {
            await prisma.user.update({
                where: { walletAddress },
                data: {
                    laamPoints: { increment: totalLaamToDeposit },
                    tagTickets: { increment: Math.floor(totalTagToDeposit) } // Assuming TAG is stored here
                }
            });
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