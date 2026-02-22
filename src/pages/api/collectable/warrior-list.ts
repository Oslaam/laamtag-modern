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
        console.log(`--- SEARCHING WARRIORS FOR: ${address} ---`);

        const response = await fetch(HELIUS_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'warrior-search',
                method: 'searchAssets',
                params: {
                    ownerAddress: address,
                    tokenType: "all",
                    grouping: ["collection", WARRIOR_COLLECTION],
                    page: 1,
                    limit: 100,
                    options: {
                        showCollectionMetadata: true,
                    }
                }
            })
        });

        const data = await response.json();
        const items = data?.result?.items || [];

        // No more manual filtering needed! Helius only returned what we asked for.

        const warriorNfts = await Promise.all(items.map(async (asset: any) => {
            const name = asset.content?.metadata?.name || "Neural Warrior";

            // Check links.image, then files array, then fall back to an empty string
            let rawImage = asset.content?.links?.image || asset.content?.files?.[0]?.uri || "";

            // If the image is missing from the main response, try fetching the JSON metadata
            if (!rawImage && asset.content?.json_uri) {
                try {
                    const metaRes = await fetch(formatIpfsUrl(asset.content.json_uri));
                    const meta = await metaRes.json();
                    rawImage = meta?.image || "";
                } catch (e) {
                    console.log(`Metadata fetch failed for ${name}`);
                }
            }

            return {
                mint: asset.id,
                name,
                image: formatIpfsUrl(rawImage)
            };
        }));

        console.log(`Found ${warriorNfts.length} Warriors for this wallet.`);
        return res.status(200).json({ nfts: warriorNfts });

    } catch (error: any) {
        console.error("Warrior API ERROR:", error.message);
        return res.status(500).json({ nfts: [], error: error.message });
    }
}