import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { logActivity } from '../../../lib/activityLogger';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';

const RPC_URL = process.env.HELIUS_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, 'confirmed');
const TREASURY_WALLET = "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc";
const PRICE_PER_TICKET_SOL = 0.003;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { walletAddress, amount, signature } = req.body;

    // FIX 1: Better validation
    if (!walletAddress || !amount || !signature) {
        return res.status(400).json({
            message: "Missing required fields: walletAddress, amount, or signature"
        });
    }

    try {
        // FIX 2: Prevent replay attacks
        const signatureIdentifier = `SOL_PURCHASE_${signature}`;
        const existingTx = await prisma.activity.findFirst({
            where: {
                userId: walletAddress,
                type: signatureIdentifier
            }
        });

        if (existingTx) {
            return res.status(400).json({
                message: "This transaction has already been processed."
            });
        }

        // FIX 3: Enhanced retry logic with better error messages
        if (!signature) {
            return res.status(400).json({ message: "No transaction signature provided" });
        }

        let tx = null;
        let retries = 0;
        const maxRetries = 8;

        console.log(`Searching for transaction: ${signature}`);

        while (!tx && retries < maxRetries) {
            try {
                tx = await connection.getTransaction(signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0
                });

                if (!tx) {
                    retries++;
                    console.log(`Retry ${retries}/${maxRetries} - Transaction not found yet...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (err) {
                console.error(` Error fetching transaction (attempt ${retries + 1}):`, err);
                retries++;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        //  FIX 4: Better error messages
        if (!tx) {
            return res.status(400).json({
                message: "Transaction not found on blockchain after multiple attempts. Please wait 30 seconds and check your balance."
            });
        }

        if (tx.meta?.err) {
            console.error(" Transaction failed on blockchain:", tx.meta.err);
            return res.status(400).json({
                message: "Transaction failed on blockchain. Please check your wallet.",
                error: JSON.stringify(tx.meta.err)
            });
        }

        // FIX 5: Verify sender & recipient
        const accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys;
        const sender = accountKeys[0].toBase58();
        const treasuryIndex = accountKeys.findIndex(k => k.toBase58() === TREASURY_WALLET);

        if (sender !== walletAddress) {
            console.error("Wallet mismatch:", { expected: walletAddress, actual: sender });
            return res.status(400).json({ message: "Security Alert: Wallet address mismatch" });
        }

        if (treasuryIndex === -1) {
            console.error("Treasury wallet not found in transaction");
            return res.status(400).json({ message: "Security Alert: Invalid recipient" });
        }

        // FIX 6: Verify amount
        const preBalance = tx.meta.preBalances[treasuryIndex];
        const postBalance = tx.meta.postBalances[treasuryIndex];
        const actualReceivedSol = (postBalance - preBalance) / LAMPORTS_PER_SOL;
        const expectedSol = amount * PRICE_PER_TICKET_SOL;

        console.log(`Payment verification:`, {
            expected: expectedSol,
            actual: actualReceivedSol,
            difference: Math.abs(expectedSol - actualReceivedSol)
        });

        if (actualReceivedSol < (expectedSol - 0.0001)) {
            return res.status(400).json({
                message: `Insufficient payment. Expected ${expectedSol} SOL, received ${actualReceivedSol} SOL`
            });
        }

        // FIX 7: Database update
        const updatedUser = await prisma.user.update({
            where: { walletAddress },
            data: {
                tagTickets: { increment: amount },
                totalTagPurchased: { increment: amount }
            }
        });

        // FIX 8: Logging
        await logActivity(walletAddress, signatureIdentifier, amount, 'TAG');

        console.log(`Purchase successful:`, {
            wallet: walletAddress,
            amount,
            newBalance: updatedUser.tagTickets,
            signature
        });

        return res.status(200).json({
            success: true,
            newBalance: updatedUser.tagTickets,
            message: `Successfully purchased ${amount} TAG tickets`
        });

    } catch (error: any) {
        console.error("Verification Error:", error);
        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        });
    }
}