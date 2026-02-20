import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';
import { publicKey } from '@metaplex-foundation/umi';
import { NextApiRequest, NextApiResponse } from 'next';

// This checks both the public and private versions to be safe
const WARRIOR_COLLECTION = process.env.NEXT_PUBLIC_WARRIOR_COLLECTION_MINT || process.env.WARRIOR_COLLECTION_MINT;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address } = req.query;

    if (!address || !WARRIOR_COLLECTION) {
        console.error("CONFIG_ERROR: Missing Wallet or Collection ID");
        return res.status(400).json({ error: "Configuration Missing" });
    }

    try {
        const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!).use(dasApi());

        const assets = await (umi.rpc as any).getAssetsByOwner({
            owner: publicKey(address as string),
            limit: 100,
        }) || { items: [] };

        const items = assets.items || [];

        // DEBUG: This helps us see in Railway logs what Helius is actually sending
        console.log(`Found ${items.length} total NFTs for ${address}`);

        const warriorNfts = items
            .filter((asset: any) => {
                // Check grouping (standard collection)
                const group = asset.grouping?.find((g: any) => g.group_key === 'collection');
                const isGroupMatch = group && group.group_value === WARRIOR_COLLECTION;

                // Check metadata (fallback)
                const isMetadataMatch = asset.content?.metadata?.collection?.address === WARRIOR_COLLECTION;

                return isGroupMatch || isMetadataMatch;
            })
            .map((asset: any) => ({
                mint: asset.id,
                name: asset.content.metadata?.name || "Neural Warrior",
                image: asset.content.links?.image || "",
            }));

        return res.status(200).json({ nfts: warriorNfts });
    } catch (error) {
        console.error("DAS API FETCH FAILED:", error);
        return res.status(200).json({ nfts: [] });
    }
}