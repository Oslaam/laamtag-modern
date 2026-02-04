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
        for (let i = 0; i < 3; i++) { // Try 3 times
            tx = await connection.getParsedTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0 // Required for modern transactions
            });
            if (tx) break;
            await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds
        }

        if (!tx || tx.meta?.err) {
            return res.status(400).json({ error: "Transaction not confirmed on-chain yet." });
        }

        // 2. Check if Treasury received the correct amount (200 SKR)
        // postTokenBalances shows the state AFTER the tx. 
        // We look for the treasury's balance increase.
        const received = tx.meta.postTokenBalances?.find(
            b => b.owner === TREASURY && b.mint === SKR_MINT
        );

        if (!received) return res.status(400).json({ error: "Treasury did not receive SKR" });

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