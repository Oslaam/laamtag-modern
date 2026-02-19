import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { Connection } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCandyMachine, fetchCandyMachine } from '@metaplex-foundation/mpl-candy-machine';
import { publicKey } from '@metaplex-foundation/umi';

const prisma = new PrismaClient();
const connection = new Connection(process.env.NEXT_PUBLIC_RPC_ENDPOINT!);
const CANDY_MACHINE_ID = publicKey(process.env.NEXT_PUBLIC_WARRIOR_CANDY_MACHINE_ID!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { signature, walletAddress, mode } = req.body;

    try {
        // 1. PREVENTION: Check if this signature was already used
        const existingTx = await prisma.activity.findFirst({ where: { signature } });
        if (existingTx) return res.status(400).json({ error: "Transaction already processed" });

        // 2. VERIFICATION: Fetch tx from Solana
        const tx = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (!tx) return res.status(404).json({ error: "Transaction not found on chain" });

        // 3. FETCH BATCH INFO: Determine current batch number
        const umi = createUmi(process.env.NEXT_PUBLIC_RPC_ENDPOINT!).use(mplCandyMachine());
        const candyMachine = await fetchCandyMachine(umi, CANDY_MACHINE_ID);
        const currentBatch = Math.floor(Number(candyMachine.itemsRedeemed) / 20);

        // 4. BUSINESS LOGIC: Update Database
        const updateData: any = {
            personalMinted: { increment: 1 },
        };

        if (mode === 'allow') {
            updateData.lastWarriorMint = new Date();
            updateData.lastWarriorMintBatch = currentBatch; // Lock user to this specific batch
        }

        const user = await prisma.user.update({
            where: { walletAddress },
            data: updateData
        });

        // Log the activity to prevent replay attacks
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
    } finally {
        await prisma.$disconnect();
    }
}