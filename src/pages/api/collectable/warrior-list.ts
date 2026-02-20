import { NextApiRequest, NextApiResponse } from 'next';

const WARRIOR_COLLECTION = "5LoQty88d9q9GhBcwVLYZPjaPNKMmBkK765PWah5msgJ";
const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";

const formatIpfsUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("https://")) return url;
    if (url.startsWith("ipfs://")) return url.replace("ipfs://", "https://ipfs.io/ipfs/");
    return url;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: "Wallet address required" });

    try {
        console.log(`--- FETCHING WARRIORS FOR: ${address} ---`);

        const response = await fetch(HELIUS_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'warrior-fetch',
                method: 'getAssetsByOwner',
                params: {
                    ownerAddress: address,
                    page: 1,
                    limit: 100,
                    displayOptions: { showFungible: false }
                }
            })
        });

        const data = await response.json();
        const items = data?.result?.items || [];
        const target = WARRIOR_COLLECTION.toLowerCase();

        const filtered = items.filter((asset: any) => {
            const grouping = asset.grouping?.find((g: any) => g.group_key === 'collection');
            return grouping?.group_value?.toLowerCase() === target;
        });

        // Fetch off-chain metadata for each warrior to get the real image
        const warriorNfts = await Promise.all(filtered.map(async (asset: any) => {
            const name = asset.content?.metadata?.name || "Neural Warrior";

            // Try standard fields first
            let rawImage = asset.content?.links?.image || asset.content?.files?.[0]?.uri || "";

            // If empty, fetch the metadata URI directly
            if (!rawImage) {
                const jsonUri = asset.content?.json_uri;
                if (jsonUri) {
                    try {
                        const metaRes = await fetch(formatIpfsUrl(jsonUri));
                        const meta = await metaRes.json();
                        rawImage = meta?.image || "";
                    } catch (e) {
                        console.log(`Failed to fetch metadata for ${name}`);
                    }
                }
            }
            const image = formatIpfsUrl(rawImage);
            return { mint: asset.id, name, image };
        }));

        console.log(`Successfully matched ${warriorNfts.length} Warriors.`);
        return res.status(200).json({ nfts: warriorNfts });

    } catch (error: any) {
        console.error("API ERROR:", error.message);
        return res.status(200).json({ nfts: [], error: error.message });
    }
}