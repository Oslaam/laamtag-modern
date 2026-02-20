import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Connection, PublicKey } from '@solana/web3.js';

// Configuration
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://app.uselaamtag.xyz/api/rpc-proxy";
const connection = new Connection(RPC_URL);
const TREASURY_WALLET = "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc";
const SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
const UNLOCK_AMOUNT = 200;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { walletAddress, action, score, signature, type, history, duration } = req.body;
    const finalWallet = walletAddress || (req.query.walletAddress as string);

    // --- UTC Reset Logic ---
    const now = new Date();
    const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

    try {
        // 1. FETCH LEADERBOARD WITH USERNAMES
        if (req.method === 'GET' || action === 'GET_LEADERBOARD') {
            const isDaily = req.query.type === 'daily' || type === 'daily';
            const dateFilter = isDaily ? utcMidnight : new Date(0);

            // Fetch activities including the User model for usernames
            const topActivities = await prisma.activity.findMany({
                where: {
                    type: 'RESISTANCE_SCORE',
                    createdAt: { gte: dateFilter }
                },
                distinct: ['userId'],
                orderBy: { amount: 'desc' },
                take: 10,
                include: {
                    user: {
                        select: { username: true }
                    }
                }
            });

            // Fetch specific user's best score
            let userBest = 0;
            if (finalWallet) {
                const bestRecord = await prisma.activity.findFirst({
                    where: {
                        userId: finalWallet,
                        type: 'RESISTANCE_SCORE',
                        createdAt: { gte: dateFilter }
                    },
                    orderBy: { amount: 'desc' },
                    select: { amount: true }
                });
                userBest = bestRecord?.amount || 0;
            }

            return res.status(200).json({
                leaderboard: topActivities.map(act => ({
                    wallet: act.userId,
                    username: act.user?.username || null, // Included username for the frontend
                    score: act.amount
                })),
                userBest
            });
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

        // 3. SECURE SUBMIT SCORE
        if (action === 'SUBMIT_SCORE') {
            const user = await prisma.user.findUnique({ where: { walletAddress: finalWallet } });
            if (!user?.hasResistanceUnlocked) return res.status(403).json({ error: "Unlock required" });

            if (!history || !Array.isArray(history)) {
                return res.status(400).json({ error: "Missing move history" });
            }

            // Anti-Cheat: Speed check
            const avgTimePerMove = duration / history.length;
            if (avgTimePerMove < 400) {
                return res.status(403).json({ error: "Suspiciously fast play detected." });
            }

            // Score Verification
            let calculatedScore = 0;
            for (const move of history) {
                const { coords, values, pointsEarned } = move;

                // Math verification: verify numbers in selection sum to 10
                const moveSum = values.reduce((a: number, b: number) => a + b, 0);
                if (moveSum !== 10) return res.status(403).json({ error: "Math verification failed." });

                const width = Math.abs(coords.x2 - coords.x1) + 1;
                const height = Math.abs(coords.y2 - coords.y1) + 1;
                const maxPossiblePoints = width * height;

                if (pointsEarned > maxPossiblePoints || pointsEarned !== values.length) {
                    return res.status(403).json({ error: "Invalid move math detected." });
                }
                calculatedScore += pointsEarned;
            }

            if (calculatedScore !== score) {
                return res.status(403).json({ error: "Score verification failed." });
            }

            // DAILY RESET LOGIC: Find existing record for TODAY (UTC)
            const dailyBest = await prisma.activity.findFirst({
                where: {
                    userId: finalWallet,
                    type: 'RESISTANCE_SCORE',
                    createdAt: { gte: utcMidnight }
                }
            });

            if (!dailyBest || score > dailyBest.amount) {
                if (dailyBest) {
                    await prisma.activity.update({
                        where: { id: dailyBest.id },
                        data: { amount: score }
                    });
                } else {
                    await prisma.activity.create({
                        data: {
                            userId: finalWallet,
                            type: 'RESISTANCE_SCORE',
                            amount: score,
                            asset: 'POINTS'
                        }
                    });
                }
            }
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: "Invalid action" });

    } catch (e: any) {
        console.error("API Error:", e);
        return res.status(500).json({ error: e.message || "Internal server error" });
    }
}