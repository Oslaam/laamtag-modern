import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferCheckedInstruction } from '@solana/spl-token';
import bs58 from 'bs58';

const prisma = new PrismaClient();
// Ensure your RPC URL is in .env
const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { mintAddress, walletAddress } = req.body;

    try {
        // 1. Validate Warrior Status and Ownership in DB
        const warrior = await prisma.deployedWarrior.findUnique({
            where: { mintAddress }
        });

        if (!warrior) {
            return res.status(404).json({ error: "Unit not found in barracks." });
        }

        // SECURITY CHECK: Ensure the requester is the actual owner
        if (warrior.ownerAddress !== walletAddress) {
            return res.status(403).json({ error: "Unauthorized: You do not own this warrior." });
        }

        if (warrior.status !== 'IDLE') {
            return res.status(400).json({ error: "Unit is currently deployed on a mission and cannot be withdrawn." });
        }

        // 2. Initialize Treasury (Server-side signing)
        if (!process.env.TREASURY_PRIVATE_KEY) {
            throw new Error("Server configuration error: Treasury key missing.");
        }

        const treasuryKeypair = Keypair.fromSecretKey(
            bs58.decode(process.env.TREASURY_PRIVATE_KEY)
        );

        const mint = new PublicKey(mintAddress);
        const userWallet = new PublicKey(walletAddress);

        // 3. Build the Transaction
        const fromAta = await getAssociatedTokenAddress(mint, treasuryKeypair.publicKey);
        const toAta = await getAssociatedTokenAddress(mint, userWallet);

        const tx = new Transaction().add(
            createTransferCheckedInstruction(
                fromAta,
                mint,
                toAta,
                treasuryKeypair.publicKey,
                1, // Amount
                0  // Decimals for NFTs
            )
        );

        // 4. Execute on Solana
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        tx.feePayer = treasuryKeypair.publicKey;

        const signature = await connection.sendTransaction(tx, [treasuryKeypair]);
        await connection.confirmTransaction(signature, 'confirmed');

        // 5. Update Database (Remove the record)
        await prisma.deployedWarrior.delete({
            where: { mintAddress }
        });

        // Optional: Log the withdrawal activity
        await prisma.activity.create({
            data: {
                userId: walletAddress,
                type: "WARRIOR_WITHDRAWAL",
                asset: "NFT",
                amount: 1,
                signature: signature
            }
        });

        return res.status(200).json({ success: true, signature });

    } catch (error: any) {
        console.error("Withdrawal Error:", error);
        return res.status(500).json({ error: error.message || "Extraction failed." });
    }
}