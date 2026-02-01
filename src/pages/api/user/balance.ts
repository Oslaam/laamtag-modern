import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';

// Simple in-memory cache to store decimals for different mint addresses
const decimalCache: Record<string, number> = {
    "SKRbvo6Gf7Gondit3BbTfuRDPqLWei4j2Qy2NPGZhW3": 6 // Pre-set SKR based on your screenshot
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address, mint } = req.query;

    if (!address || !mint) return res.status(400).json({ balance: 0 });

    try {
        const rpcEndpoint = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpcEndpoint);

        const userPubKey = new PublicKey(address as string);
        const mintPubKey = new PublicKey(mint as string);
        const mintAddressStr = mintPubKey.toBase58();

        // 1. Get/Check decimals from cache or RPC
        let decimals: number;
        if (decimalCache[mintAddressStr] !== undefined) {
            decimals = decimalCache[mintAddressStr];
        } else {
            const mintInfo = await connection.getTokenSupply(mintPubKey);
            decimals = mintInfo.value.decimals;
            decimalCache[mintAddressStr] = decimals; // Store for future requests
        }

        // 2. Find the ATA and fetch account info
        const ata = await getAssociatedTokenAddress(mintPubKey, userPubKey);
        const account = await getAccount(connection, ata);

        // 3. Calculate balance using the correct decimals (6 for SKR)
        const balance = Number(account.amount) / Math.pow(10, decimals);

        return res.status(200).json({ balance });
    } catch (e) {
        // If account doesn't exist, return 0
        return res.status(200).json({ balance: 0 });
    }
}