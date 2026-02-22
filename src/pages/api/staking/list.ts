import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import axios from 'axios';

const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3`;
const CREATOR_ADDRESS = "DhMECuyiL61unsDLhGTrqxKLrUoTPtEd9SXamr9Xbeoz";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: "Address required" });

    try {
        const activeBoosts = await prisma.multiplierBoost.findMany({
            where: {
                userAddress: address as string,
                expiresAt: { gt: new Date() }
            }
        });

        // 2. Fetch Assets using SEARCH (Best for big wallets)
        const response = await axios.post(HELIUS_RPC, {
            jsonrpc: "2.0",
            id: "staking-search",
            method: "searchAssets",
            params: {
                ownerAddress: address,
                tokenType: "all",
                // Use the primary Collection ID here
                grouping: ["collection", "Dtuj3q4a2LxqhgQa3sDeGWeRsohKk38s5XgyrkRR6FLc"],
                page: 1,
                limit: 1000,
                options: { showCollectionMetadata: true }
            },
        });

        // Helius filtered it for us, so everything here belongs to you
        const walletItems = response.data.result.items || [];

        const dbStakes = await prisma.stakedNFT.findMany({
            where: { ownerAddress: address as string }
        });

        const vaultedMints = dbStakes.map(s => s.mintAddress);
        let vaultedItems = [];

        if (vaultedMints.length > 0) {
            const vaultResponse = await axios.post(HELIUS_RPC, {
                jsonrpc: "2.0",
                id: "vault-fetch",
                method: "getAssetBatch",
                params: { ids: vaultedMints },
            });
            vaultedItems = vaultResponse.data.result || [];
        }

        const formattedWalletNfts = walletItems.map((nft: any) => ({
            mint: nft.id,
            name: nft.content?.metadata?.name || "Neural Warrior",
            image: nft.content?.links?.image || "",
            staked: false
        }));

        const formattedVaultNfts = vaultedItems.map((nft: any) => ({
            mint: nft.id,
            name: nft.content?.metadata?.name || "Neural Warrior",
            image: nft.content?.links?.image || "",
            staked: true
        }));

        return res.status(200).json({
            nfts: [...formattedWalletNfts, ...formattedVaultNfts],
            rawStakes: dbStakes,
            activeBoosts: activeBoosts
        });

    } catch (error) {
        console.error("List Error:", error);
        return res.status(500).json({ error: "Failed to fetch staking status" });
    }
}