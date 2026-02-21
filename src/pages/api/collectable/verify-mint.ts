import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { Connection } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCandyMachine, fetchCandyMachine } from '@metaplex-foundation/mpl-candy-machine';
import { publicKey } from '@metaplex-foundation/umi';

// Prevent multiple Prisma instances in development
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { signature, walletAddress, mode } = req.body;

    // 1. Validate Config & Input
    const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    const CM_ID_RAW = process.env.NEXT_PUBLIC_WARRIOR_CANDY_MACHINE_ID;

    if (!RPC || !CM_ID_RAW || !signature || !walletAddress) {
        return res.status(400).json({ error: "Missing configuration or parameters" });
    }

    try {
        const connection = new Connection(RPC);
        const CANDY_MACHINE_ID = publicKey(CM_ID_RAW);

        // 2. Double-spend prevention
        const existingTx = await prisma.activity.findFirst({ where: { signature } });
        if (existingTx) return res.status(400).json({ error: "Transaction already processed" });

        // 3. Verification on chain
        // Note: signature from frontend is base64, getTransaction expects base58 usually
        // If your frontend sends base64, keep the Buffer conversion.
        const tx = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (!tx) return res.status(404).json({ error: "Transaction not found on chain" });

        // 4. Determine Batch (Critical for the lock logic)
        const umi = createUmi(RPC).use(mplCandyMachine());
        const candyMachine = await fetchCandyMachine(umi, CANDY_MACHINE_ID);
        const currentBatch = Math.floor(Number(candyMachine.itemsRedeemed) / 20);

        // 5. Update DB
        const updateData: any = {
            warriorMinted: { increment: 1 },
        };

        if (mode === 'allow') {
            updateData.lastWarriorMint = new Date();
            updateData.lastWarriorMintBatch = currentBatch;
        }

        const user = await prisma.user.update({
            where: { walletAddress },
            data: updateData
        });

        await prisma.activity.create({
            data: {
                userId: walletAddress,
                type: "MINT",
                asset: "NFT",
                amount: mode === 'allow' ? 300 : 1000,
                signature
            }
        });

        return res.status(200).json({ success: true, personalMinted: user.personalMinted });

    } catch (error) {
        console.error("VERIFY_ERROR", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
    // Removed $disconnect to keep connection pool alive for next request
}