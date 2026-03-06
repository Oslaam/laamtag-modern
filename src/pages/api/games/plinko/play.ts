import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import crypto from 'crypto';

const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
const connection = new Connection(RPC_URL);
const TREASURY_WALLET = "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc";
const SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";

const MULTIPLIERS: Record<number, number[]> = {
    8: [5.6, 2.1, 1.1, 0.5, 0, 0.5, 1.1, 2.1, 5.6],
    9: [5.6, 2, 1.6, 0.7, 0, 0, 0.7, 1.6, 2, 5.6],
    10: [8.9, 3, 1.4, 1.1, 0.5, 0, 0.5, 1.1, 1.4, 3, 8.9],
    11: [8.4, 3, 1.9, 1.3, 0.7, 0, 0, 0.7, 1.3, 1.9, 3, 8.4],
    12: [10, 3, 1.6, 1.4, 1.1, 0.5, 0, 0.5, 1.1, 1.4, 1.6, 3, 10],
    13: [8.1, 4, 3, 1.9, 1.2, 0.9, 0, 0, 0.9, 1.2, 1.9, 3, 4, 8.1],
    14: [7.1, 4, 1.9, 1.4, 1.3, 1.1, 0.5, 0, 0.5, 1.1, 1.3, 1.4, 1.9, 4, 7.1],
    15: [15, 8, 3, 2, 1.5, 1.1, 0.7, 0, 0, 0.7, 1.1, 1.5, 2, 3, 8, 15],
    16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 0.5, 0, 0.5, 1.1, 1.2, 1.4, 1.4, 2, 9, 16]
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();
    const { action, walletAddress, lines, signature, betAmount } = req.body;

    try {
        if (action === 'UNLOCK_GAME') {
            if (!signature) return res.status(400).json({ error: "Missing signature" });

            // Replay protection for unlocking
            const alreadyUsed = await prisma.usedSignature.findUnique({ where: { signature } });
            if (alreadyUsed) return res.status(400).json({ error: "Signature already used" });

            const txDetails = await connection.getParsedTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
            if (!txDetails) return res.status(400).json({ error: "Transaction not found" });

            await prisma.usedSignature.create({
                data: { signature, userId: walletAddress, purpose: 'PLINKO_UNLOCK' }
            });

            await prisma.user.update({
                where: { walletAddress },
                data: { hasPlinkoUnlocked: true }
            });
            return res.status(200).json({ success: true });
        }

        if (action === 'PLAY') {
            if (!signature) return res.status(400).json({ error: "Bet signature missing" });

            // 1. REPLAY PROTECTION
            const alreadyUsed = await prisma.usedSignature.findUnique({ where: { signature } });
            if (alreadyUsed) return res.status(400).json({ error: "Duplicate Signature" });

            // 2. CHECK LOCK STATUS
            const user = await prisma.user.findUnique({ where: { walletAddress } });
            if (!user?.hasPlinkoUnlocked) return res.status(403).json({ error: "Game Locked" });

            // 3. VERIFY ON-CHAIN TRANSACTION & PAYMENT
            const txDetails = await connection.getParsedTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });

            if (!txDetails) return res.status(400).json({ error: "Transaction not found" });

            // Calculate how much SKR the Treasury actually received
            const treasuryAta = getAssociatedTokenAddressSync(
                new PublicKey(SKR_MINT),
                new PublicKey(TREASURY_WALLET)
            ).toBase58();

            // Find the balance change for your treasury account
            const accountKeys = (txDetails.transaction.message.accountKeys as any[]).map((k) =>
                k.pubkey ? k.pubkey.toBase58() : k.toBase58()
            );
            const treasuryAtaIndex = accountKeys.indexOf(treasuryAta);

            if (treasuryAtaIndex === -1) {
                return res.status(400).json({ error: "Treasury not found in transaction" });
            }

            const preBalance = txDetails.meta?.preTokenBalances?.find(
                (b) => b.accountIndex === treasuryAtaIndex
            )?.uiTokenAmount.uiAmount ?? 0;

            const postBalance = txDetails.meta?.postTokenBalances?.find(
                (b) => b.accountIndex === treasuryAtaIndex
            )?.uiTokenAmount.uiAmount ?? 0;
            const actualReceived = postBalance - preBalance;

            // Ensure they paid at least the betAmount (with a tiny buffer for rounding)
            if (actualReceived < (betAmount - 0.01)) {
                return res.status(400).json({ error: `Payment mismatch. Expected ${betAmount}, got ${actualReceived}` });
            }

            // 4. MARK SIGNATURE AS USED
            await prisma.usedSignature.create({
                data: { signature, userId: walletAddress, purpose: 'PLINKO_PLAY' }
            });

            // 5. RECORD BET IMMEDIATELY
            await prisma.activity.create({
                data: {
                    userId: walletAddress,
                    type: 'PLINKO_PLAY',
                    amount: -betAmount,
                    asset: 'SKR'
                }
            });

            // 6. CRYPTOGRAPHIC FAIRNESS (Replace Math.random)
            const serverSeed = process.env.PLINKO_SECRET;
            const hash = crypto.createHmac('sha256', serverSeed).update(signature).digest('hex');
            const secureRandom = parseInt(hash.substring(0, 8), 16) / 0xffffffff;

            // 7. WEIGHTED CALCULATION (Difficulty Factor 0.5)
            const numSlots = lines + 1;
            const middleIndex = Math.floor(numSlots / 2);

            const weights = Array.from({ length: numSlots }, (_, i) => {
                const distance = Math.abs(i - middleIndex);
                return Math.pow(0.4, distance);
            });

            const totalWeight = weights.reduce((a, b) => a + b, 0);
            let randomPointer = secureRandom * totalWeight;
            let targetSlot = 0;

            for (let i = 0; i < weights.length; i++) {
                if (randomPointer < weights[i]) {
                    targetSlot = i;
                    break;
                }
                randomPointer -= weights[i];
            }

            // 8. GENERATE PATH (For animation compatibility)
            let path = new Array(lines).fill(0);
            let onesPlaced = 0;
            // Distribute moves to reach targetSlot
            const totalOnesNeeded = targetSlot;
            const indices = Array.from({ length: lines }, (_, i) => i);
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(secureRandom * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            for (let i = 0; i < totalOnesNeeded; i++) {
                path[indices[i]] = 1;
            }

            // 9. CALCULATE WIN
            const multiplier = MULTIPLIERS[lines][targetSlot];
            const winAmount = Math.floor(betAmount * multiplier);

            // 10. RECORD WIN
            if (winAmount > 0) {
                await prisma.pendingReward.create({
                    data: {
                        userId: walletAddress,
                        asset: 'SKR',
                        amount: winAmount,
                        isClaimed: false
                    }
                });

                await prisma.activity.create({
                    data: {
                        userId: walletAddress,
                        type: 'PLINK_WIN',
                        amount: winAmount,
                        asset: 'SKR'
                    }
                });
            }

            return res.status(200).json({ path, winAmount, targetSlot });
        }
    } catch (error: any) {
        console.error("Plinko API Error:", error);
        return res.status(500).json({ error: error.message });
    }
}