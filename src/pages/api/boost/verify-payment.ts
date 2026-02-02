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

        // 1. Fetch Transaction with 'confirmed' commitment
        const tx = await connection.getParsedTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (!tx || tx.meta?.err) return res.status(400).json({ error: "Transaction invalid or not found" });

        // 2. Replay Protection
        const existingActivity = await prisma.activity.findFirst({ where: { signature } });
        if (existingActivity) return res.status(400).json({ error: "Already processed" });

        // 3. SECURE VERIFICATION: Check Balance Changes
        const treasuryBalanceEntry = tx.meta?.postTokenBalances?.find(
            (balance) =>
                balance.owner === TREASURY_WALLET &&
                balance.mint === SKR_MINT
        );

        if (!treasuryBalanceEntry) {
            return res.status(400).json({ error: "Payment verification failed: Treasury did not receive SKR" });
        }

        const preBalance = tx.meta?.preTokenBalances?.find(
            (b) => b.owner === TREASURY_WALLET && b.mint === SKR_MINT
        )?.uiTokenAmount.uiAmount || 0;

        const postBalance = treasuryBalanceEntry.uiTokenAmount.uiAmount || 0;
        const amountReceived = postBalance - preBalance;

        if (amountReceived < (officialPrice - 0.01)) {
            return res.status(400).json({
                error: `Insufficient payment. Expected ${officialPrice}, got ${amountReceived}`
            });
        }

        // --- 4. START QUEUE LOGIC (Next Cycle Alignment) ---

        // 1. Calculate the NEXT reward cycle start (Midnight UTC)
        let nextRewardCycle = new Date();
        nextRewardCycle.setUTCHours(24, 0, 0, 0);

        // 2. Find if this NFT already has a future boost queued
        const latestBoost = await prisma.multiplierBoost.findFirst({
            where: { mintAddress: mintAddress },
            orderBy: { expiresAt: 'desc' }
        });

        let startTime: Date;

        if (latestBoost && new Date(latestBoost.expiresAt) > nextRewardCycle) {
            // If there is already a boost queued for the future, 
            // start this new one exactly when the last one ends.
            startTime = new Date(latestBoost.expiresAt);
        } else {
            // If no future boost is active, start this one at the NEXT cycle (Midnight).
            // This ensures it doesn't touch the current "7 hours remaining" cycle.
            startTime = nextRewardCycle;
        }

        // 3. The boost lasts 7 days FROM the start time
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
            message: "Boost added to Queue for next reward cycle!"
        });

    } catch (error) {
        console.error("Verification Error:", error);
        return res.status(500).json({ error: "Server error" });
    }
}