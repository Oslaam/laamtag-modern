import type { NextApiRequest, NextApiResponse } from 'next';

const HELIUS_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const response = await fetch(HELIUS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });
        const data = await response.json();
        res.status(200).json(data);
    } catch (err) {
        console.error('RPC Proxy Error:', err);
        res.status(500).json({ error: 'RPC proxy failed' });
    }
}