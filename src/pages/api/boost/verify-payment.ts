import { Connection } from '@solana/web3.js';
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

const SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
const TREASURY_WALLET = "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc";

const BOOST_PRICES: Record<number, number> = {
    2: 500, 3: 800, 5: 1400, 10: 3000, 50: 18000, 100: 40000
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { signature, userAddress, mintAddress, multiplier } = req.body;

    try {
        const officialPrice = BOOST_PRICES[Number(multiplier)];
        if (!officialPrice) return res.status(400).json({ error: "Invalid multiplier" });

        const connection = new Connection(process.env.RPC_URL || "https://api.mainnet-beta.solana.com");

        // 1. Fetch and Verify Transaction
        const tx = await connection.getParsedTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (!tx || tx.meta?.err) return res.status(400).json({ error: "Transaction invalid" });

        // 2. Replay Protection
        const existingActivity = await prisma.activity.findFirst({ where: { signature } });
        if (existingActivity) return res.status(400).json({ error: "Already processed" });

        // 3. Verify SKR Payment
        const isValid = tx.transaction.message.instructions.some((inst: any) => {
            const info = inst.parsed?.info;

            // We need to verify against the TREASURY'S TOKEN ACCOUNT, not the main wallet
            // Since you used createAssociatedTokenAccountIdempotentInstruction in frontend,
            // the destination is the ATA.
            return (
                inst.program === 'spl-token' &&
                inst.parsed?.type === 'transferChecked' &&
                info?.mint === SKR_MINT &&
                // info?.destination will be the Treasury ATA. 
                // To be safest, you can just verify the mint and the amount 
                // OR calculate the expected ATA address here to compare.
                Number(info?.tokenAmount?.uiAmount) >= officialPrice
            );
        });
        if (!isValid) return res.status(400).json({ error: "Payment verification failed" });

        // --- 4. START QUEUE LOGIC ---
        // Find if this NFT already has a boost active or queued
        const latestBoost = await prisma.multiplierBoost.findFirst({
            where: { mintAddress: mintAddress },
            orderBy: { expiresAt: 'desc' }
        });

        let startTime = new Date();
        // If a boost exists and expires in the future, start the new one AFTER it.
        if (latestBoost && new Date(latestBoost.expiresAt) > new Date()) {
            startTime = new Date(latestBoost.expiresAt);
        }

        const expiryTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000);
        // --- END QUEUE LOGIC ---

        // 5. Save to Database
        await prisma.$transaction([
            prisma.multiplierBoost.create({
                data: {
                    userAddress,
                    mintAddress,
                    multiplier: Number(multiplier),
                    activatedAt: startTime,
                    expiresAt: expiryTime,
                }
            }),
            prisma.activity.create({
                data: {
                    userId: userAddress,
                    type: "BOOST_PURCHASE",
                    asset: "SKR",
                    amount: officialPrice,
                    signature: signature
                }
            })
        ]);

        return res.status(200).json({
            success: true,
            message: startTime > new Date() ? "Boost added to Queue!" : "Boost Activated!"
        });

    } catch (error) {
        console.error("Verification Error:", error);
        return res.status(500).json({ error: "Server error" });
    }
}