import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { Connection } from '@solana/web3.js';

const SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { walletAddress, signature } = req.body;

    try {
        const connection = new Connection(process.env.RPC_URL || "https://api.mainnet-beta.solana.com");

        // 1. REPLAY PROTECTION
        const existingActivity = await prisma.activity.findFirst({ where: { signature } });
        if (existingActivity) return res.status(400).json({ error: "Transaction already processed." });

        // 2. FETCH TRANSACTION (Using Parsed for better JSON handling)
        let tx = null;
        for (let i = 0; i < 6; i++) {
            tx = await connection.getParsedTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });
            if (tx && tx.meta) break;
            await new Promise(r => setTimeout(r, 2000));
        }

        if (!tx || !tx.meta) {
            return res.status(400).json({ error: "Could not find transaction metadata. Try again in a moment." });
        }

        // 3. SECURE DELTA VERIFICATION
        const postBalances = tx.meta.postTokenBalances || [];
        const preBalances = tx.meta.preTokenBalances || [];

        // Find entry by mint only (Seeker-safe)
        const postEntry = postBalances.find(b => b.mint === SKR_MINT);
        const preEntry = preBalances.find(b => b.mint === SKR_MINT);

        const postAmount = postEntry?.uiTokenAmount?.uiAmount || 0;
        const preAmount = preEntry?.uiTokenAmount?.uiAmount || 0;
        const amountReceived = postAmount - preAmount;

        if (amountReceived < 199.9) {
            return res.status(400).json({ error: `Payment mismatch. Received: ${amountReceived} SKR` });
        }

        // 4. DATABASE UPDATE (Check user existence first to prevent Prisma 500)
        const userExists = await prisma.user.findUnique({ where: { walletAddress } });
        if (!userExists) {
            return res.status(404).json({ error: "User not found in database." });
        }

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

        return res.status(200).json({ success: true });

    } catch (error: any) {
        // This will now show up in your server logs so you can see the EXACT line that failed
        console.error("CRITICAL BACKEND ERROR:", error.message);
        return res.status(500).json({ error: "Internal server error during verification" });
    }
}