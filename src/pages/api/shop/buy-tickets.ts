import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { logActivity } from '../../../lib/activityLogger';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Setup connection
const RPC_URL = process.env.HELIUS_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL);
const TREASURY_WALLET = "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc";

// Price logic - Adjust to match your shop.tsx (0.003 SOL per 1 TAG)
const PRICE_PER_TICKET_SOL = 0.003;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { walletAddress, amount, signature } = req.body;

    try {
        // 1. PREVENT SIGNATURE REPLAY (The Workaround)
        // We use the signature in the 'type' string to ensure it's unique in the DB
        const signatureIdentifier = `SOL_PURCHASE_${signature}`;

        // We check the 'activity' table (matching your schema.prisma model name)
        const existingTx = await prisma.activity.findFirst({
            where: {
                userId: walletAddress,
                type: signatureIdentifier
            }
        });

        if (existingTx) {
            return res.status(400).json({ message: "This transaction has already been claimed." });
        }

        // 2. BLOCKCHAIN VERIFICATION (Seeker-Optimized Retry Logic)
        if (!signature) {
            return res.status(400).json({ message: "No transaction signature provided" });
        }

        let tx = null;
        let retries = 0;

        // Try up to 5 times to find the transaction on the network
        while (!tx && retries < 5) {
            tx = await connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });

            if (!tx) {
                retries++;
                // Wait 1.5 seconds for the RPC to index the data
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        if (!tx || tx.meta?.err) {
            return res.status(400).json({ message: "Transaction failed or not found after retries." });
        }

        // 3. VERIFY SENDER & RECIPIENT
        const accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys;
        const sender = accountKeys[0].toBase58();
        const treasuryIndex = accountKeys.findIndex(k => k.toBase58() === TREASURY_WALLET);

        if (sender !== walletAddress) {
            return res.status(400).json({ message: "Security Alert: Wallet address mismatch" });
        }
        if (treasuryIndex === -1) {
            return res.status(400).json({ message: "Security Alert: Invalid recipient" });
        }

        // 4. VERIFY AMOUNT SENT
        const preBalance = tx.meta.preBalances[treasuryIndex];
        const postBalance = tx.meta.postBalances[treasuryIndex];
        const actualReceivedSol = (postBalance - preBalance) / LAMPORTS_PER_SOL;
        const expectedSol = amount * PRICE_PER_TICKET_SOL;

        // Allow for tiny rounding differences
        if (actualReceivedSol < (expectedSol - 0.0001)) {
            return res.status(400).json({ message: `Insufficient SOL. Expected ${expectedSol}, found ${actualReceivedSol}` });
        }

        // 5. DATABASE UPDATE
        const updatedUser = await prisma.user.update({
            where: { walletAddress },
            data: {
                tagTickets: { increment: amount },
                totalTagPurchased: { increment: amount }
            }
        });

        // 6. LOGGING
        // We store the unique signatureIdentifier in the 'type' field to prevent replay next time
        await logActivity(walletAddress, signatureIdentifier, amount, 'TAG');

        return res.status(200).json({
            success: true,
            newBalance: updatedUser.tagTickets
        });
    } catch (error) {
        console.error("Verification Error:", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}