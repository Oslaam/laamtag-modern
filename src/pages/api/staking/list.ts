// src/pages/api/staking/list.ts
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import axios from 'axios';

const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3`;
const COLLECTION_IDS = [
    "Dtuj3q4a2LxqhgQa3sDeGWeRsohKk38s5XgyrkRR6FLc",
    "1a04e8d91d2cbed3d7114ade645e2dbf3d531e4657d2dbf57fd44c99a0cfa901"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address } = req.query;

    if (!address) return res.status(400).json({ error: "Address required" });

    try {
        // 1. Fetch active boosts first
        const activeBoosts = await prisma.multiplierBoost.findMany({
            where: {
                userAddress: address as string,
                expiresAt: { gt: new Date() }
            }
        });

        // 2. Fetch Assets from Helius
        const response = await axios.post(HELIUS_RPC, {
            jsonrpc: "2.0",
            id: "my-id",
            method: "getAssetsByOwner",
            params: {
                ownerAddress: address,
                page: 1,
                limit: 100,
                displayOptions: { showCollectionMetadata: true }
            },
        });



        const walletItems = response.data.result.items.filter((item: any) =>
            item.grouping?.some((g: any) =>
                g.group_key === "collection" && COLLECTION_IDS.includes(g.group_value)
            )
        );

        // 3. Fetch Staked Status from DB
        const dbStakes = await prisma.stakedNFT.findMany({
            where: { ownerAddress: address as string }
        });

        const vaultedMints = dbStakes.map(s => s.mintAddress);
        let vaultedItems = [];
        if (vaultedMints.length > 0) {
            const vaultResponse = await axios.post(HELIUS_RPC, {
                jsonrpc: "2.0",
                id: "my-id",
                method: "getAssetBatch",
                params: { ids: vaultedMints },
            });
            vaultedItems = vaultResponse.data.result;
        }

        // 4. Format the output
        const formattedWalletNfts = walletItems.map((nft: any) => ({
            mint: nft.id,
            name: nft.content.metadata.name,
            image: nft.content.links.image,
            staked: false
        }));

        const formattedVaultNfts = vaultedItems.map((nft: any) => ({
            mint: nft.id,
            name: nft.content.metadata.name,
            image: nft.content.links.image,
            staked: true
        }));

        // 5. Single Return Point
        return res.status(200).json({
            nfts: [...formattedWalletNfts, ...formattedVaultNfts],
            rawStakes: dbStakes,
            activeBoosts: activeBoosts // Now the UI knows which NFT has a boost
        });

    } catch (error) {
        console.error("List Error:", error);
        return res.status(500).json({ error: "Failed to fetch staking status" });
    }
}