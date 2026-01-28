// src/pages/api/swap/transaction.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    try {
        const { quoteResponse, userPublicKey } = req.body;

        const response = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse,
                userPublicKey,
                wrapAndUnwrapSol: true,
                // YOUR TREASURY WALLET
                feeAccount: "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc",
                dynamicComputeUnitLimit: true, // Optimizes for speed
                prioritizationFeeLamports: 'auto'
            })
        });

        const swapTransaction = await response.json();
        res.status(200).json(swapTransaction);
    } catch (error) {
        res.status(500).json({ error: "Failed to create swap transaction" });
    }
}