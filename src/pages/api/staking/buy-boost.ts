import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import axios from 'axios';

const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3`;
const MY_COLLECTION_ID = "Dtuj3q4a2LxqhgQa3sDeGWeRsohKk38s5XgyrkRR6FLc";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // --- 1. BLOCK POST REQUESTS ---
    // We moved purchase logic to /api/boost/verify-payment.ts to enforce SKR usage
    if (req.method === 'POST') {
        return res.status(405).json({ message: "Use the verify-payment endpoint for SKR purchases." });
    }

    // --- 2. HANDLE LISTING (GET) ---
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: "Address required" });

    try {
        // Fetch ALL boosts that haven't expired yet
        const allBoosts = await prisma.multiplierBoost.findMany({
            where: {
                userAddress: address as string,
                expiresAt: { gt: new Date() }
            },
            orderBy: { activatedAt: 'asc' }
        });

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
            item.grouping?.some((g: any) => g.group_key === "collection" && g.group_value === MY_COLLECTION_ID)
        );

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

        return res.status(200).json({
            nfts: [...formattedWalletNfts, ...formattedVaultNfts],
            rawStakes: dbStakes,
            activeBoosts: allBoosts
        });

    } catch (error) {
        console.error("List Error:", error);
        return res.status(500).json({ error: "Failed to fetch staking status" });
    }
}