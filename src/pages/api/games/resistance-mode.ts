import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Connection, PublicKey } from '@solana/web3.js';

// Configuration
const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
const connection = new Connection(RPC_URL);
const TREASURY_WALLET = "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc";
const SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
const UNLOCK_AMOUNT = 200;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { walletAddress, action, score, signature, type, history, duration } = req.body;
    const finalWallet = walletAddress || (req.query.walletAddress as string);

    try {
        // 1. FETCH LEADERBOARD
        if (req.method === 'GET' || action === 'GET_LEADERBOARD') {
            const isDaily = req.query.type === 'daily' || type === 'daily';
            const dateFilter = isDaily ? new Date(new Date().setHours(0, 0, 0, 0)) : new Date(0);

            // Group by userId (wallet) to ensure one entry per person
            const topScores = await prisma.activity.groupBy({
                by: ['userId'],
                where: {
                    type: 'RESISTANCE_SCORE',
                    createdAt: { gte: dateFilter }
                },
                _max: {
                    amount: true // Get their highest score
                },
                orderBy: {
                    _max: {
                        amount: 'desc' // Rank by those highest scores
                    }
                },
                take: 10,
            });

            // Map the grouped data to match your frontend format
            return res.status(200).json(topScores.map(s => ({
                wallet: s.userId,
                score: s._max.amount
            })));
        }

        if (!finalWallet) return res.status(400).json({ error: "Missing wallet address" });

        // 2. SECURE ONE-TIME UNLOCK
        if (action === 'UNLOCK_GAME') {
            if (!signature) return res.status(400).json({ error: "Missing transaction signature" });

            const txDetails = await connection.getParsedTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });

            if (!txDetails) return res.status(400).json({ error: "Transaction not found on-chain" });

            const treasuryBalanceChange = txDetails.meta?.postTokenBalances?.find(
                (b) => b.owner === TREASURY_WALLET && b.mint === SKR_MINT
            );
            const prevTreasuryBalance = txDetails.meta?.preTokenBalances?.find(
                (b) => b.owner === TREASURY_WALLET && b.mint === SKR_MINT
            );

            const amountReceived = (Number(treasuryBalanceChange?.uiTokenAmount.amount) || 0) - (Number(prevTreasuryBalance?.uiTokenAmount.amount) || 0);

            if (amountReceived <= 0) return res.status(400).json({ error: "No SKR transfer detected" });

            return await prisma.$transaction(async (tx) => {
                await tx.user.upsert({
                    where: { walletAddress: finalWallet },
                    update: { hasResistanceUnlocked: true },
                    create: { walletAddress: finalWallet, hasResistanceUnlocked: true }
                });

                await tx.activity.create({
                    data: {
                        userId: finalWallet,
                        type: 'RESISTANCE_UNLOCK',
                        amount: UNLOCK_AMOUNT,
                        asset: 'SKR',
                        signature: signature
                    }
                });
                return res.status(200).json({ success: true });
            });
        }

        // 3. SECURE SUBMIT SCORE (With Move Validation)
        if (action === 'SUBMIT_SCORE') {
            const user = await prisma.user.findUnique({ where: { walletAddress: finalWallet } });
            if (!user?.hasResistanceUnlocked) return res.status(403).json({ error: "Unlock required" });

            // --- MOVE VALIDATION LOGIC ---
            if (!history || !Array.isArray(history)) {
                return res.status(400).json({ error: "Missing move history" });
            }

            // Anti-Bot: Check average speed (400ms is human limit for selecting boxes)
            const avgTimePerMove = duration / history.length;
            if (avgTimePerMove < 400) {
                return res.status(403).json({ error: "Suspiciously fast play detected." });
            }

            // Verify Logic: Sum moves
            let calculatedScore = 0;
            for (const move of history) {
                const { coords, pointsEarned } = move;
                // Calculate size of selection box
                const width = Math.abs(coords.x2 - coords.x1) + 1;
                const height = Math.abs(coords.y2 - coords.y1) + 1;
                const maxPossiblePoints = width * height;

                if (pointsEarned > maxPossiblePoints) {
                    return res.status(403).json({ error: "Invalid move math detected." });
                }
                calculatedScore += pointsEarned;
            }

            // Final score check
            if (calculatedScore !== score) {
                return res.status(403).json({ error: "Score verification failed." });
            }

            // Save Score
            const today = new Date(new Date().setHours(0, 0, 0, 0));
            const existingScore = await prisma.activity.findFirst({
                where: {
                    userId: finalWallet,
                    type: 'RESISTANCE_SCORE',
                    createdAt: { gte: today }
                }
            });

            if (!existingScore || score > existingScore.amount) {
                if (existingScore) await prisma.activity.delete({ where: { id: existingScore.id } });

                await prisma.activity.create({
                    data: {
                        userId: finalWallet,
                        type: 'RESISTANCE_SCORE',
                        amount: score,
                        asset: 'POINTS'
                    }
                });
            }
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: "Invalid action" });

    } catch (e: any) {
        console.error("API Error:", e);
        return res.status(500).json({ error: e.message || "Internal server error" });
    }
}