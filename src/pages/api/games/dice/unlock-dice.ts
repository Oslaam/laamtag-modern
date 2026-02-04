import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { Connection } from '@solana/web3.js';

const SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
const TREASURY = "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    const { walletAddress, signature } = req.body;

    try {
        // --- STEP 1: Check Environment ---
        const rpc = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpc, 'confirmed');

        // --- STEP 2: Check Prisma ---
        if (!prisma) {
            return res.status(500).json({ error: "Prisma client not initialized" });
        }

        const user = await prisma.user.findUnique({ where: { walletAddress } });
        if (!user) {
            return res.status(404).json({ error: "User record not found in DB" });
        }

        // --- STEP 3: Verify Transaction ---
        let tx = null;
        for (let i = 0; i < 5; i++) {
            tx = await connection.getParsedTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });
            if (tx?.meta) break;
            await new Promise(r => setTimeout(r, 2000));
        }

        if (!tx || !tx.meta) {
            return res.status(400).json({ error: "Transaction metadata not found on chain" });
        }

        // --- STEP 4: Balance Logic ---
        const post = tx.meta.postTokenBalances?.find(b => b.mint === SKR_MINT && b.owner === TREASURY);
        const pre = tx.meta.preTokenBalances?.find(b => b.mint === SKR_MINT && b.owner === TREASURY);

        const amountReceived = (post?.uiTokenAmount.uiAmount || 0) - (pre?.uiTokenAmount.uiAmount || 0);

        if (amountReceived < 199.9) {
            return res.status(400).json({ error: `Insufficient payment: ${amountReceived} SKR` });
        }

        // --- STEP 5: Database Update ---
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

    } catch (err: any) {
        // This prints the REAL error to your browser console so you can tell me what it says
        console.error("DETAILED_ERROR:", err.message);
        return res.status(500).json({
            error: "Internal Server Error",
            debug: err.message, // This lets you see the error on your Seeker
            stack: err.stack
        });
    }
}