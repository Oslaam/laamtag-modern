import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, createSignerFromKeypair, publicKey, base58 } from '@metaplex-foundation/umi';
import { mplTokenMetadata, transferV1, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();
    const { walletAddress, mintAddress } = req.body;

    // These rates must match your RewardTicker component exactly
    const LAAM_PER_SEC = 500 / 86400;
    const TAG_PER_SEC = 20 / 86400;

    try {
        const stake = await prisma.stakedNFT.findUnique({ where: { mintAddress } });
        if (!stake || stake.ownerAddress !== walletAddress) {
            return res.status(404).json({ message: "Stake record not found." });
        }

        const now = Date.now();
        const stakedAt = new Date(stake.stakedAt).getTime();
        const lockDuration = 48 * 60 * 60 * 1000;

        if (now - stakedAt < lockDuration) {
            return res.status(403).json({ message: "48h Cooldown active." });
        }

        const umi = createUmi("https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3")
            .use(mplTokenMetadata());

        let secretKey: Uint8Array;
        const rawKey = process.env.TREASURY_PRIVATE_KEY || "";
        if (rawKey.startsWith('[')) {
            secretKey = new Uint8Array(JSON.parse(rawKey));
        } else {
            secretKey = base58.serialize(rawKey);
        }

        const treasuryKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
        const treasurySigner = createSignerFromKeypair(umi, treasuryKeypair);
        umi.use(keypairIdentity(treasurySigner));

        const { signature } = await transferV1(umi, {
            mint: publicKey(mintAddress),
            authority: treasurySigner,
            tokenOwner: treasurySigner.publicKey,
            destinationOwner: publicKey(walletAddress),
            tokenStandard: TokenStandard.NonFungible,
        }).sendAndConfirm(umi);

        // PRECISION CALCULATION:
        // Calculate total seconds since the 48h lock ended
        const secondsEarned = Math.max(0, ((now - stakedAt) - lockDuration) / 1000);

        // Calculate rewards with full decimal precision for the database
        const laamEarned = secondsEarned * LAAM_PER_SEC;
        const tagEarned = secondsEarned * TAG_PER_SEC;

        await prisma.$transaction([
            prisma.rewardHistory.create({
                data: {
                    walletAddress,
                    mintAddress,
                    laamEarned,
                    tagEarned,
                    unstakedAt: new Date()
                }
            }),
            prisma.user.update({
                where: { walletAddress },
                data: {
                    laamPoints: { increment: laamEarned },
                    tagTickets: { increment: tagEarned }
                }
            }),
            prisma.stakedNFT.delete({ where: { mintAddress } }),

            prisma.multiplierBoost.deleteMany({ where: { mintAddress: mintAddress } })
        ]);

        return res.status(200).json({
            success: true,
            signature: base58.deserialize(signature)[0]
        });

    } catch (error) {
        console.error("Unstake Error:", error);
        return res.status(500).json({ message: "Failed to release NFT." });
    }
}