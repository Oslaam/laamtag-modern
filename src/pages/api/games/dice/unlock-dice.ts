import { Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import prisma from '../../../../lib/prisma';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    const { walletAddress, signature } = req.body;

    // FIX: Solve the "Invalid Param" error by cleaning the signature
    let cleanSignature = "";
    try {
        if (typeof signature === 'string') {
            cleanSignature = signature;
        } else if (signature && typeof signature === 'object') {
            // Mobile (Seeker) often sends signatures as {type: 'Buffer', data: [...]}
            const sigArray = signature.data ? signature.data : Object.values(signature);
            cleanSignature = bs58.encode(new Uint8Array(sigArray));
        }

        if (!cleanSignature) throw new Error("Empty signature");
    } catch (e) {
        return res.status(400).json({ error: "Malformed signature format" });
    }

    try {
        const rpc = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpc, 'confirmed');

        // Verify the transaction exists
        const tx = await connection.getParsedTransaction(cleanSignature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
        });

        if (!tx) {
            return res.status(404).json({ error: "Transaction not found. Solana might be slow, try again." });
        }

        // Use UPSERT: Fixes P2025 (Record not found) and P1001 (Connection) errors
        const user = await prisma.user.upsert({
            where: { walletAddress },
            update: { hasPaidDiceEntry: true },
            create: {
                walletAddress,
                hasPaidDiceEntry: true,
                tagTickets: 50 // Matching your game logic
            }
        });

        return res.status(200).json({ success: true, user });

    } catch (err: any) {
        console.error("DICE_UNLOCK_CRASH:", err);
        // We send the real error back so we can see it on the Seeker if it fails again
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
}