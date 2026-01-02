import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { fetchAllDigitalAssetByOwner } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";

const NftCard = ({ nft }: { nft: any }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    // Check if the NFT is officially verified
    const isVerified = nft.metadata.collection?.verified === true;

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await fetch(nft.metadata.uri);
                const json = await response.json();
                setImageUrl(json.image);
            } catch (e) {
                console.error("Failed to load NFT metadata", e);
            }
        };
        fetchMetadata();
    }, [nft.metadata.uri]);

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-2 group hover:border-yellow-500/30 transition-all">
            <div className="relative aspect-square bg-gray-900 rounded-xl overflow-hidden mb-3">
                {imageUrl ? (
                    <img src={imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Verification Badge */}
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8px] font-bold shadow-lg ${isVerified ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {isVerified ? "VERIFIED" : "UNVERIFIED"}
                </div>
            </div>

            <p className="text-[10px] font-black uppercase text-yellow-500 truncate px-1">{nft.metadata.name}</p>

            <a
                href={`https://solscan.io/token/${nft.publicKey.toString()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-center text-[9px] text-gray-500 hover:text-white border border-white/5 hover:border-white/20 rounded py-1 transition"
            >
                View on Solscan ↗
            </a>
        </div>
    );
};

export default function NftGallery() {
    const { publicKey } = useWallet();
    const [nfts, setNfts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!publicKey) return;
        const loadNfts = async () => {
            setLoading(true);
            try {
                const umi = createUmi("https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY");
                const owner = umiPublicKey(publicKey.toString());
                const allAssets = await fetchAllDigitalAssetByOwner(umi, owner);

                const laamtagNfts = allAssets.filter(asset =>
                    asset.metadata.name.includes("LAAMTAG") || asset.metadata.symbol === "LAAM"
                );
                setNfts(laamtagNfts);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        loadNfts();
    }, [publicKey]);

    if (!publicKey) return null;

    return (
        <div className="mt-12 max-w-6xl mx-auto px-4">
            <h3 className="text-xl font-black italic text-white uppercase mb-6">
                Vaulted Positions <span className="text-yellow-500">({nfts.length})</span>
            </h3>
            {loading ? (
                <div className="text-yellow-500 font-bold animate-pulse">Scanning Sector...</div>
            ) : nfts.length === 0 ? (
                <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-12 text-center text-gray-500 italic">
                    No Genesis Positions detected.
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {nfts.map((nft) => <NftCard key={nft.publicKey.toString()} nft={nft} />)}
                </div>
            )}
        </div>
    );
}