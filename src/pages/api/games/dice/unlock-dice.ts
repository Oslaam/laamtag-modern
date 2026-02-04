// src/pages/api/games/dice/unlock-dice.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { Connection } from '@solana/web3.js';

const SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
        return res.status(400).json({ error: "Missing walletAddress or signature" });
    }

    try {
        const connection = new Connection(
            process.env.RPC_URL || "https://api.mainnet-beta.solana.com"
        );

        // 1. REPLAY PROTECTION
        // Check if this signature has already been used to unlock the game
        const alreadyUsed = await prisma.activity.findFirst({
            where: { signature }
        });

        if (alreadyUsed) {
            return res.status(400).json({ error: "Transaction already processed" });
        }

        // 2. FETCH TRANSACTION (Retry loop for RPC propagation)
        // We use getTransaction for better stability with Versioned Transactions (v0)
        let tx = null;
        for (let i = 0; i < 5; i++) {
            tx = await connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });
            if (tx && tx.meta) break;
            await new Promise(r => setTimeout(r, 2000));
        }

        if (!tx || tx.meta?.err) {
            return res.status(400).json({ error: "Transaction not found or failed on-chain" });
        }

        // 3. MOBILE-SAFE VERIFICATION (Delta Check)
        // We look for the SKR movement and ignore the 'owner' field to avoid 
        // inconsistent RPC parsing on Solana Mobile (Seeker).
        const postBalances = tx.meta.postTokenBalances ?? [];
        const preBalances = tx.meta.preTokenBalances ?? [];

        const postEntry = postBalances.find(b => b.mint === SKR_MINT);
        const preEntry = preBalances.find(b => b.mint === SKR_MINT);

        if (!postEntry) {
            return res.status(400).json({ error: "SKR payment not detected in transaction metadata" });
        }

        const postAmount = postEntry.uiTokenAmount.uiAmount ?? 0;
        const preAmount = preEntry?.uiTokenAmount.uiAmount ?? 0;

        // Calculate how much the balance increased
        const amountReceived = postAmount - preAmount;

        console.log(`[DICE UNLOCK] Wallet: ${walletAddress} | Received: ${amountReceived} SKR`);

        // Check for 200 SKR (threshold at 199.9 to handle minor float precision)
        if (amountReceived < 199.9) {
            return res.status(400).json({
                error: `Insufficient payment. Received ${amountReceived.toFixed(2)} SKR`
            });
        }

        // 4. ATOMIC DATABASE UPDATE
        // Unlocks the game and logs the activity in one transaction
        await prisma.$transaction([
            prisma.user.update({
                where: { walletAddress },
                data: { hasPaidDiceEntry: true }
            }),
            prisma.activity.create({
                data: {
                    userId: walletAddress,
                    type: "DICE_GATE_FEE",
                    asset: "SKR",
                    amount: 200,
                    signature: signature
                }
            })
        ]);

        return res.status(200).json({
            success: true,
            message: "Dice module decrypted and unlocked"
        });

    } catch (error: any) {
        console.error("CRITICAL UNLOCK ERROR:", error);
        return res.status(500).json({
            error: "Internal server error during verification"
        });
    }
}