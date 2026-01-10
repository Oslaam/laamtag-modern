import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
    keypairIdentity,
    createSignerFromKeypair,
    publicKey,
    base58,
    sol
} from '@metaplex-foundation/umi';
import {
    mplToolbox,
    transferSol,
    transferTokens,
    findAssociatedTokenPda,
    createTokenIfMissing
} from '@metaplex-foundation/mpl-toolbox';

const USDC_MINT = publicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();
    const { walletAddress, assetType } = req.body;

    try {
        // 1. Fetch rewards from DB
        const rewards = await prisma.pendingReward.findMany({
            where: { userId: walletAddress, asset: assetType }
        });

        if (rewards.length === 0) {
            return res.status(400).json({ message: `No ${assetType} to claim.` });
        }

        // 2. Calculate Fee (10%) and User Payout
        const originalAmount = rewards.reduce((sum, r) => sum + r.amount, 0);
        const feePercentage = 0.10;
        const feeAmount = originalAmount * feePercentage;
        const userAmount = originalAmount - feeAmount;

        // 3. Setup Umi with the Toolbox plugin
        const umi = createUmi(process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com")
            .use(mplToolbox());

        const secretKey = base58.serialize(process.env.TREASURY_PRIVATE_KEY || "");
        const treasuryKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
        const treasurySigner = createSignerFromKeypair(umi, treasuryKeypair);
        umi.use(keypairIdentity(treasurySigner));

        // 4. Process Payouts
        if (assetType === 'SOL') {
            await transferSol(umi, {
                destination: publicKey(walletAddress),
                amount: sol(userAmount), // Sending 90%
            }).sendAndConfirm(umi);

        } else if (assetType === 'USDC') {
            const userOwner = publicKey(walletAddress);
            const sourceATA = findAssociatedTokenPda(umi, {
                mint: USDC_MINT,
                owner: treasurySigner.publicKey
            });
            const destinationATA = findAssociatedTokenPda(umi, {
                mint: USDC_MINT,
                owner: userOwner
            });

            // Calculate atomic amount for 90%
            const atomicUserAmount = BigInt(Math.floor(userAmount * 1_000_000));

            // Create account if missing (Treasury pays rent) and transfer 90%
            await createTokenIfMissing(umi, {
                mint: USDC_MINT,
                owner: userOwner,
                payer: treasurySigner,
            })
                .add(
                    transferTokens(umi, {
                        source: sourceATA,
                        destination: destinationATA,
                        authority: treasurySigner,
                        amount: atomicUserAmount,
                    })
                )
                .sendAndConfirm(umi);
        }

        // 5. Cleanup Database
        await prisma.pendingReward.deleteMany({
            where: { id: { in: rewards.map(r => r.id) } }
        });

        // 6. Return success with clear message about the 10% fee
        return res.status(200).json({
            success: true,
            message: `Claimed ${userAmount.toFixed(4)} ${assetType}! (10% deducted for system rent and service fee).`
        });

    } catch (error: any) {
        console.error("--- PAYOUT ERROR ---");
        console.error(error);

        return res.status(500).json({
            message: "Payout failed.",
            debug: error.message
        });
    }
}