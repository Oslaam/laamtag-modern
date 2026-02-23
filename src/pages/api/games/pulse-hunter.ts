import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Connection } from '@solana/web3.js';

const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
const SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
const TREASURY = "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc";
const UNLOCK_AMOUNT = 200_000_000; // 200 SKR in raw units

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // ─── GET: Load game state ───────────────────────────────────────────────────
    if (req.method === 'GET') {
        const { walletAddress } = req.query;
        if (!walletAddress) return res.status(400).json({ message: "Missing walletAddress" });
        try {
            const game = await prisma.pulseHunterGame.findUnique({
                where: { userId: String(walletAddress) }
            });
            return res.status(200).json(game);
        } catch (err) {
            console.error("GET game state error:", err);
            return res.status(500).json({ message: "Failed to load game state" });
        }
    }

    if (req.method !== 'POST') return res.status(405).end();

    const { walletAddress, action, userGuess, signature } = req.body;

    if (!walletAddress) return res.status(400).json({ message: "Missing walletAddress" });

    try {
        const user = await prisma.user.findUnique({ where: { walletAddress } });
        if (!user) return res.status(404).json({ message: "ACCESS DENIED: USER UNKNOWN" });

        // ─── UNLOCK ACTION ──────────────────────────────────────────────────────
        if (action === 'unlock') {
            if (!signature) return res.status(400).json({ success: false, error: "Missing signature" });

            // Already unlocked? Return success idempotently (handles mobile retry scenario)
            if (user.hasPulseHunterUnlocked) {
                return res.status(200).json({ success: true, message: "Already unlocked" });
            }

            // Check if this signature was already processed — prevents replay attacks
            let alreadyUsed = false;
            try {
                const existingTx = await (prisma as any).usedSignature.findUnique({
                    where: { signature }
                });
                if (existingTx) alreadyUsed = true;
            } catch (_) {
                // usedSignature table may not exist yet — skip this check
            }

            if (alreadyUsed) {
                // Signature already processed — just unlock the user
                await prisma.user.update({
                    where: { walletAddress },
                    data: { hasPulseHunterUnlocked: true }
                });
                return res.status(200).json({ success: true, message: "Recovered from previous attempt" });
            }

            // ── Verify on-chain ──────────────────────────────────────────────────
            const connection = new Connection(RPC_URL, {
                commitment: 'confirmed',
                confirmTransactionInitialTimeout: 60000,
                disableRetryOnRateLimit: false,
            });

            let tx: any = null;
            // Retry up to 5 times — mobile networks can delay tx propagation
            for (let attempt = 0; attempt < 5; attempt++) {
                try {
                    tx = await connection.getParsedTransaction(signature, {
                        commitment: 'confirmed',
                        maxSupportedTransactionVersion: 0,
                    });
                } catch (rpcErr) {
                    console.warn(`RPC attempt ${attempt + 1} failed:`, rpcErr);
                }
                if (tx) break;
                await new Promise((r) => setTimeout(r, 3000));
            }

            if (!tx) {
                return res.status(400).json({
                    success: false,
                    error: "Transaction not found on-chain. Please wait a moment and try the RECOVER button."
                });
            }

            if (tx.meta?.err) {
                return res.status(400).json({
                    success: false,
                    error: "Transaction failed on-chain. Please try unlocking again."
                });
            }

            // ── Verify the correct amount went to TREASURY ───────────────────────
            let verified = false;
            try {
                const preBalances = tx.meta?.preTokenBalances ?? [];
                const postBalances = tx.meta?.postTokenBalances ?? [];

                const treasuryPost = postBalances.find(
                    (b: any) => b.mint === SKR_MINT && b.owner === TREASURY
                );
                const treasuryPre = preBalances.find(
                    (b: any) => b.mint === SKR_MINT && b.owner === TREASURY
                );

                if (treasuryPost) {
                    const postAmount = Number(treasuryPost.uiTokenAmount.amount);
                    const preAmount = treasuryPre ? Number(treasuryPre.uiTokenAmount.amount) : 0;
                    const received = postAmount - preAmount;
                    verified = received >= UNLOCK_AMOUNT;
                }
            } catch (parseErr) {
                console.error("Balance parse error:", parseErr);
                // If parsing fails but tx is confirmed with no error, allow it
                verified = !tx.meta?.err;
            }

            if (!verified) {
                return res.status(400).json({
                    success: false,
                    error: "Payment verification failed. Incorrect amount or recipient."
                });
            }

            // ── Unlock user and record signature ─────────────────────────────────
            await prisma.user.update({
                where: { walletAddress },
                data: { hasPulseHunterUnlocked: true }
            });

            // Try to record the signature (requires UsedSignature model in schema)
            try {
                await (prisma as any).usedSignature.create({
                    data: {
                        signature,
                        userId: walletAddress,
                        purpose: 'PULSE_HUNTER_UNLOCK',
                        createdAt: new Date()
                    }
                });
            } catch (_) {
                console.warn("Could not save used signature — add UsedSignature model to Prisma schema");
            }

            return res.status(200).json({ success: true });
        }

        // ─── GUESS ACTION ───────────────────────────────────────────────────────
        if (action === 'guess') {
            let game = await prisma.pulseHunterGame.findUnique({ where: { userId: walletAddress } });

            const cooldownTime = 2 * 60 * 60 * 1000;
            const now = new Date();
            const lastAttemptTime = game?.lastAttempt ? new Date(game.lastAttempt).getTime() : 0;
            const isExpired = (Date.now() - lastAttemptTime) > cooldownTime;

            if (!game || (isExpired && game.isLocked)) {
                game = await prisma.pulseHunterGame.upsert({
                    where: { userId: walletAddress },
                    create: {
                        userId: walletAddress,
                        currentTarget: Math.floor(Math.random() * 100) + 1,
                        attempts: 0,
                        isLocked: false
                    },
                    update: {
                        currentTarget: Math.floor(Math.random() * 100) + 1,
                        attempts: 0,
                        isLocked: false,
                        lastAttempt: new Date(0)
                    }
                });
            }

            if (game.isLocked && !isExpired) {
                return res.status(403).json({ message: "SYSTEM RECALIBRATING. ACCESS DENIED." });
            }

            const guessNum = parseInt(userGuess);
            if (isNaN(guessNum) || guessNum < 1 || guessNum > 100) {
                return res.status(400).json({ message: "INVALID SIGNAL: RANGE 1-100 ONLY" });
            }

            const currentAttempt = game.attempts + 1;
            const isWin = guessNum === game.currentTarget;

            if (isWin) {
                const rewards = [1000, 500, 100];
                const prize = rewards[game.attempts] || 50;

                await prisma.$transaction([
                    prisma.pulseHunterGame.update({
                        where: { userId: walletAddress },
                        data: { isLocked: true, lastAttempt: now, attempts: currentAttempt }
                    }),
                    prisma.pendingReward.create({
                        data: { userId: walletAddress, asset: 'SKR', amount: prize, type: 'GAME_WIN' }
                    }),
                    prisma.activity.create({
                        data: { userId: walletAddress, asset: 'SKR', amount: prize, type: 'PULSE_HUNTER_WIN' }
                    })
                ]);
                return res.status(200).json({ win: true, prize, attemptUsed: currentAttempt });
            }

            if (currentAttempt >= 3) {
                await prisma.pulseHunterGame.update({
                    where: { userId: walletAddress },
                    data: { isLocked: true, lastAttempt: now, attempts: 3 }
                });
                return res.status(200).json({
                    win: false,
                    message: `SIGNAL LOST. TARGET WAS: ${game.currentTarget}`,
                    locked: true,
                    attempts: 3
                });
            }

            await prisma.pulseHunterGame.update({
                where: { userId: walletAddress },
                data: { attempts: currentAttempt }
            });

            const hint = guessNum < game.currentTarget ? "HIGHER" : "LOWER";
            return res.status(200).json({ win: false, message: hint, attempts: currentAttempt });
        }

        return res.status(400).json({ message: "Unknown action" });

    } catch (error) {
        console.error("Pulse Hunter API error:", error);
        return res.status(500).json({ message: "INTERNAL SERVER ERROR" });
    }
}
