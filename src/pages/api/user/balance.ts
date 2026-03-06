import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const decimalCache: Record<string, number> = {
    "SKRbvo6Gf7Gondit3BbTfuRDPqLWei4j2Qy2NPGZhW3": 6
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address, mint } = req.query;

    if (!address) return res.status(400).json({ balance: 0, warCredits: 0 });

    try {
        // 1. FETCH DATABASE DATA (War Credits)
        const user = await prisma.user.findUnique({
            where: { walletAddress: address as string },
            select: { warCredits: true }
        });

        const warCredits = user?.warCredits || 0;

        // 2. FETCH ON-CHAIN DATA (Only if mint is provided)
        let tokenBalance = 0;
        if (mint) {
            try {
                const rpcEndpoint = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
                const connection = new Connection(rpcEndpoint);
                const userPubKey = new PublicKey(address as string);
                const mintPubKey = new PublicKey(mint as string);
                const mintAddressStr = mintPubKey.toBase58();

                let decimals: number;
                if (decimalCache[mintAddressStr] !== undefined) {
                    decimals = decimalCache[mintAddressStr];
                } else {
                    const mintInfo = await connection.getTokenSupply(mintPubKey);
                    decimals = mintInfo.value.decimals;
                    decimalCache[mintAddressStr] = decimals;
                }

                const ata = await getAssociatedTokenAddress(mintPubKey, userPubKey);
                const account = await getAccount(connection, ata);
                tokenBalance = Number(account.amount) / Math.pow(10, decimals);
            } catch (e) {
                tokenBalance = 0; // Account doesn't exist on-chain yet
            }
        }

        return res.status(200).json({
            balance: tokenBalance, // This is the $SKR from Solana
            warCredits: warCredits  // This is the credits from your DB
        });

    } catch (error) {
        console.error("API_ERROR:", error);
        return res.status(500).json({ balance: 0, warCredits: 0 });
    }
}