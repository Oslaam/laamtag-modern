import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import axios from 'axios';

const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: "Address required" });

    try {
        // 1. Fetch all NFTs owned by this wallet from Helius
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

        const allNfts = response.data.result.items;

        // 2. Fetch all currently staked NFTs for this user from your DB
        const stakes = await prisma.stakedNFT.findMany({
            where: { ownerAddress: address as string },
            select: { mintAddress: true }
        });
        const stakedMints = stakes.map(s => s.mintAddress);

        // 3. Format the data for the UI
        const formattedNfts = allNfts.map((nft: any) => ({
            mint: nft.id,
            name: nft.content.metadata.name || "Unknown NFT",
            image: nft.content.links.image || nft.content.files[0]?.uri,
            staked: stakedMints.includes(nft.id)
        }));

        return res.status(200).json({ nfts: formattedNfts });
    } catch (error) {
        console.error("Fetch staking list error:", error);
        return res.status(500).json({ error: "Failed to fetch staking status" });
    }
}