import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import axios from 'axios';

const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: "Address required" });

    try {
        // 1. Fetch NFTs currently in the WALLET
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

        const walletItems = response.data.result.items;

        // 2. Fetch all STAKED records for this user from DB
        const dbStakes = await prisma.stakedNFT.findMany({
            where: { ownerAddress: address as string }
        });

        // 3. SECRETS OF THE VAULT: Fetch metadata for Vaulted NFTs
        // Since the NFT is in the Vault, Helius won't show it under the User's address.
        // We need to fetch these specifically by their Mint IDs.
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

        // 4. COMBINE AND FORMAT
        // We mark wallet items as 'staked: false' and vaulted items as 'staked: true'
        const formattedWalletNfts = walletItems.map((nft: any) => ({
            mint: nft.id,
            name: nft.content.metadata.name || "Unknown NFT",
            image: nft.content.links.image || nft.content.files[0]?.uri,
            staked: false
        }));

        const formattedVaultNfts = vaultedItems.map((nft: any) => ({
            mint: nft.id,
            name: nft.content.metadata.name || "Staked NFT",
            image: nft.content.links.image || nft.content.files[0]?.uri,
            staked: true
        }));

        // Combine both lists so the user sees ALL their NFTs in one gallery
        const allNfts = [...formattedWalletNfts, ...formattedVaultNfts];

        return res.status(200).json({
            nfts: allNfts,
            rawStakes: dbStakes
        });

    } catch (error) {
        console.error("Fetch staking list error:", error);
        return res.status(500).json({ error: "Failed to fetch staking status" });
    }
}