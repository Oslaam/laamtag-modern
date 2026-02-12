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
const SKR_MINT = publicKey("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();
    const { walletAddress, assetType } = req.body;

    try {
        // 1. Fetch rewards from DB
        const rewards = await prisma.pendingReward.findMany({
            where: { userId: walletAddress, asset: assetType }
        });

        // Calculate total balance available
        const originalAmount = rewards.reduce((sum, r) => sum + r.amount, 0);

        // --- NEW: 1000 SKR THRESHOLD CHECK ---
        if (assetType === 'SKR' && originalAmount < 1000) {
            return res.status(400).json({
                message: `THRESHOLD NOT MET: Minimum 1000 SKR required. Current: ${originalAmount.toFixed(2)}`
            });
        }

        if (rewards.length === 0 || originalAmount <= 0) {
            return res.status(400).json({ message: `No ${assetType} to claim.` });
        }

        // 2. Calculate Fee (10%) and User Payout
        const feePercentage = 0.10;
        const feeAmount = originalAmount * feePercentage;
        const userAmount = originalAmount - feeAmount;

        // 3. Setup Umi
        const umi = createUmi(process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com")
            .use(mplToolbox());

        const privateKeyString = process.env.TREASURY_PRIVATE_KEY;
        if (!privateKeyString) throw new Error("Missing TREASURY_PRIVATE_KEY");

        // Corrected base58 decoding to fix the "Property utils does not exist" error
        const treasuryKeypair = umi.eddsa.createKeypairFromSecretKey(
            base58.serialize(privateKeyString)
        );

        const treasurySigner = createSignerFromKeypair(umi, treasuryKeypair);
        umi.use(keypairIdentity(treasurySigner));

        // 4. Process Payouts
        let signature: string = "";

        if (assetType === 'SOL') {
            const result = await transferSol(umi, {
                destination: publicKey(walletAddress),
                amount: sol(userAmount),
            }).sendAndConfirm(umi);
            signature = base58.deserialize(result.signature)[0];

        } else if (assetType === 'USDC' || assetType === 'SKR') {
            const userOwner = publicKey(walletAddress);
            const currentMint = assetType === 'USDC' ? USDC_MINT : SKR_MINT;
            const decimals = 1_000_000;
            const atomicUserAmount = BigInt(Math.floor(userAmount * decimals));

            const sourceATA = findAssociatedTokenPda(umi, {
                mint: currentMint,
                owner: treasurySigner.publicKey
            });
            const destinationATA = findAssociatedTokenPda(umi, {
                mint: currentMint,
                owner: userOwner
            });

            const result = await createTokenIfMissing(umi, {
                mint: currentMint,
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

            signature = base58.deserialize(result.signature)[0];
        }

        // 5. Cleanup Database & Log Activity
        await prisma.$transaction([
            // Delete the pending rewards that were just paid out
            prisma.pendingReward.deleteMany({
                where: { id: { in: rewards.map(r => r.id) } }
            }),

            // Create a record in the Activity table for the History Modal
            prisma.activity.create({
                data: {
                    userId: walletAddress,
                    type: "VAULT_CLAIM", // This tells the history it came from the Loot Vault
                    asset: assetType,    // "SKR", "SOL", or "USDC"
                    amount: userAmount,  // The actual amount sent to their wallet
                    signature: signature // The Solana transaction hash
                }
            })
        ]);

        return res.status(200).json({
            success: true,
            signature: signature,
            message: `Claimed ${userAmount.toFixed(4)} ${assetType}! (10% fee deducted).`
        });

    } catch (error: any) {
        console.error("--- PAYOUT ERROR ---", error);
        return res.status(500).json({
            message: "Payout failed.",
            debug: error.message
        });
    }
}