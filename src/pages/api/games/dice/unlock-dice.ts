// src/pages/api/games/dice/unlock-dice.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { Connection } from '@solana/web3.js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { walletAddress, signature } = req.body;
    const SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
    const TREASURY = "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc";

    try {
        const connection = new Connection(process.env.RPC_URL || "https://api.mainnet-beta.solana.com");

        let tx = null;
        for (let i = 0; i < 5; i++) {
            tx = await connection.getParsedTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });
            if (tx && tx.meta) break;
            await new Promise(r => setTimeout(r, 2000));
        }

        if (!tx || !tx.meta) {
            return res.status(400).json({ error: "Transaction receipt not found." });
        }

        // 2. STABLE AMOUNT CHECK
        const postBalances = tx.meta.postTokenBalances || [];
        const preBalances = tx.meta.preTokenBalances || [];

        const treasuryPost = postBalances.find(b => b.owner === TREASURY && b.mint === SKR_MINT);
        const treasuryPre = preBalances.find(b => b.owner === TREASURY && b.mint === SKR_MINT);

        // Use 0 as fallback if the account didn't exist before the tx
        const postAmount = Number(treasuryPost?.uiTokenAmount?.amount || 0);
        const preAmount = Number(treasuryPre?.uiTokenAmount?.amount || 0);

        // Calculate difference in atoms, then convert to decimals (SKR has 6)
        const diffAtoms = postAmount - preAmount;
        const amountReceived = diffAtoms / 1_000_000;

        console.log(`Verification for ${walletAddress}: Received ${amountReceived} SKR`);

        if (amountReceived < 199) { // Using 199 to account for tiny rounding issues
            return res.status(400).json({ error: `Insufficient payment. Found ${amountReceived} SKR` });
        }

        // 3. Update DB
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
    } catch (error: any) {
        console.error("CRITICAL BACKEND ERROR:", error);
        return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
}