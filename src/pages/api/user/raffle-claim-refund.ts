import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
    keypairIdentity,
    createSignerFromKeypair,
    publicKey,
    base58,
} from '@metaplex-foundation/umi';
import {
    mplToolbox,
    transferTokens,
    findAssociatedTokenPda,
    createTokenIfMissing
} from '@metaplex-foundation/mpl-toolbox';

const SKR_MINT = publicKey("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();
    const { walletAddress } = req.body;

    try {
        // 1. Fetch ONLY "REFUND" types for this user that haven't been claimed
        const refunds = await prisma.pendingReward.findMany({
            where: {
                userId: walletAddress,
                asset: 'SKR',
                type: 'REFUND',
                isClaimed: false
            }
        });

        const totalRefund = refunds.reduce((sum, r) => sum + r.amount, 0);

        if (refunds.length === 0 || totalRefund <= 0) {
            return res.status(400).json({ message: "No refunds found to claim." });
        }

        // 2. Setup Umi
        const umi = createUmi(process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com")
            .use(mplToolbox());

        const privateKeyString = process.env.TREASURY_PRIVATE_KEY as string;
        if (!privateKeyString) throw new Error("Missing TREASURY_PRIVATE_KEY");

        const secretKeyBuffer = base58.serialize(privateKeyString);
        const treasuryKeypair = umi.eddsa.createKeypairFromSecretKey(secretKeyBuffer);

        const treasurySigner = createSignerFromKeypair(umi, treasuryKeypair);
        umi.use(keypairIdentity(treasurySigner));

        // 3. Process Payout
        const userOwner = publicKey(walletAddress);
        const decimals = 1_000_000;
        const atomicAmount = BigInt(Math.floor(totalRefund * decimals));

        const sourceATA = findAssociatedTokenPda(umi, {
            mint: SKR_MINT,
            owner: treasurySigner.publicKey
        });
        const destinationATA = findAssociatedTokenPda(umi, {
            mint: SKR_MINT,
            owner: userOwner
        });

        const result = await createTokenIfMissing(umi, {
            mint: SKR_MINT,
            owner: userOwner,
            payer: treasurySigner,
        })
            .add(
                transferTokens(umi, {
                    source: sourceATA,
                    destination: destinationATA,
                    authority: treasurySigner,
                    amount: atomicAmount,
                })
            )
            .sendAndConfirm(umi);

        const signature = base58.deserialize(result.signature)[0];

        // 4. Cleanup Database
        // We update isClaimed to true FIRST, then delete, just to be extremely safe 
        // against race conditions during high traffic.
        await prisma.$transaction([
            prisma.pendingReward.updateMany({
                where: { id: { in: refunds.map(r => r.id) } },
                data: { isClaimed: true }
            }),
            prisma.pendingReward.deleteMany({
                where: { id: { in: refunds.map(r => r.id) } }
            })
        ]);

        return res.status(200).json({
            success: true,
            signature: signature,
            message: `Refund of ${totalRefund.toFixed(2)} $SKR successful!`
        });

    } catch (error: any) {
        console.error("REFUND ERROR:", error);
        return res.status(500).json({ message: "Refund transfer failed." });
    }
}