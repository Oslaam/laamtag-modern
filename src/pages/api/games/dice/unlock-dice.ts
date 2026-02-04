import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { Connection } from '@solana/web3.js';

// src/pages/api/games/dice/unlock-dice.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { walletAddress, signature } = req.body;
    const SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
    const TREASURY = "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc";

    try {
        const connection = new Connection(process.env.RPC_URL || "https://api.mainnet-beta.solana.com");

        // 1. Verify Transaction with Retry Logic
        let tx = null;
        for (let i = 0; i < 5; i++) {
            tx = await connection.getParsedTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });

            // If we found the transaction AND the receipt (meta), stop looping
            if (tx && tx.meta) break;

            // Otherwise wait 2 seconds and try again
            await new Promise(r => setTimeout(r, 2000));
        }

        // CRITICAL CHECK: Ensure tx and tx.meta actually exist
        if (!tx || !tx.meta) {
            return res.status(400).json({ error: "Transaction receipt not found. Please try again in a few seconds." });
        }

        if (tx.meta.err) {
            return res.status(400).json({ error: "Transaction failed on-chain." });
        }

        // Strict version of Step 2
        const treasuryPost = tx.meta.postTokenBalances?.find(b => b.owner === TREASURY && b.mint === SKR_MINT);
        const treasuryPre = tx.meta.preTokenBalances?.find(b => b.owner === TREASURY && b.mint === SKR_MINT);

        const amountReceived = (Number(treasuryPost?.uiTokenAmount.amount || 0) - Number(treasuryPre?.uiTokenAmount.amount || 0)) / 1_000_000;

        if (amountReceived < 200) {
            return res.status(400).json({ error: "Insufficient payment amount detected." });
        }
        
        // 3. Update DB (Remains the same)
        await prisma.user.update({
            where: { walletAddress },
            data: {
                hasPaidDiceEntry: true,
                activities: {
                    create: {
                        type: "DICE_GATE_FEE",
                        asset: "SKR",
                        amount: 200,
                        signature: signature
                    }
                }
            }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Unlock Error:", error);
        return res.status(500).json({ error: "Verification Failed" });
    }
}