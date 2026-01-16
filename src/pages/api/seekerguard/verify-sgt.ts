import type { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import {
    unpackMint,
    getMetadataPointerState,
    getTokenGroupMemberState,
    TOKEN_2022_PROGRAM_ID
} from '@solana/spl-token';

const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

const SGT_MINT_AUTHORITY = 'GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4';
const SGT_METADATA_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';
const SGT_GROUP_MINT_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { wallet } = req.body;

    if (!wallet) {
        return res.status(400).json({ error: 'Wallet address missing' });
    }

    try {
        const connection = new Connection(HELIUS_RPC_URL);
        let allTokenAccounts: any[] = [];
        let paginationKey: string | null = null;

        do {
            const response = await fetch(HELIUS_RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'sgt-check',
                    method: 'getTokenAccountsByOwnerV2',
                    params: [
                        wallet, // 1st Param: Wallet Address
                        { "programId": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" }, // 2nd Param: Correct Keyed Object
                        {
                            "encoding": "jsonParsed",
                            "limit": 1000,
                            ...(paginationKey && { paginationKey })
                        } // 3rd Param: Options
                    ]
                })
            });

            const data = await response.json();
            allTokenAccounts.push(...(data.result?.value?.accounts || []));
            paginationKey = data.result?.paginationKey || null;
        } while (paginationKey);

        if (allTokenAccounts.length === 0) {
            return res.status(200).json({ hasAccess: false });
        }

        const mintPubkeys = allTokenAccounts
            .map(a => a.account?.data?.parsed?.info?.mint)
            .filter(Boolean)
            .map((m: string) => new PublicKey(m));

        const mintInfos = await connection.getMultipleAccountsInfo(mintPubkeys);

        for (let i = 0; i < mintInfos.length; i++) {
            const info = mintInfos[i];
            if (!info) continue;

            try {
                const mint = unpackMint(mintPubkeys[i], info, TOKEN_2022_PROGRAM_ID);

                const hasAuth =
                    mint.mintAuthority?.toBase58() === SGT_MINT_AUTHORITY;

                const meta = getMetadataPointerState(mint);
                const hasMeta =
                    meta?.metadataAddress?.toBase58() === SGT_METADATA_ADDRESS &&
                    meta?.authority?.toBase58() === SGT_MINT_AUTHORITY;

                const group = getTokenGroupMemberState(mint);
                const hasGroup =
                    group?.group?.toBase58() === SGT_GROUP_MINT_ADDRESS;

                if (hasAuth && hasMeta && hasGroup) {
                    return res.status(200).json({ hasAccess: true });
                }
            } catch { }
        }

        return res.status(200).json({ hasAccess: false });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ hasAccess: false });
    }
}
