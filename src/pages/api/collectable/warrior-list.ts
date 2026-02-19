import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';
import { publicKey } from '@metaplex-foundation/umi';
import { NextApiRequest, NextApiResponse } from 'next';

const WARRIOR_COLLECTION = process.env.NEXT_PUBLIC_WARRIOR_COLLECTION_MINT;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address } = req.query;

    if (!address || !WARRIOR_COLLECTION) {
        return res.status(400).json({ error: "Configuration Missing" });
    }

    try {
        const umi = createUmi(process.env.NEXT_PUBLIC_RPC_URL!).use(dasApi());

        // Use a generic cast to avoid compilation errors if the package is still linking
        const assets = await (umi.rpc as any).getAssetsByOwner({
            owner: publicKey(address as string),
            limit: 100,
        });

        const items = assets.items || [];

        const warriorNfts = items
            .filter((asset: any) => {
                const group = asset.grouping?.find((g: any) => g.group_key === 'collection');
                return group && group.group_value === WARRIOR_COLLECTION;
            })
            .map((asset: any) => ({
                mint: asset.id,
                name: asset.content.metadata?.name || "Neural Warrior",
                image: asset.content.links?.image || "",
            }));

        return res.status(200).json({ nfts: warriorNfts });
    } catch (error) {
        console.error("DAS API FETCH FAILED:", error);
        // Return empty array instead of 500 to keep UI from breaking
        return res.status(200).json({ nfts: [] });
    }
}