import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { stakeNftOnChain } from '../lib/stakeNftTask';
import { unstakeNftOnChain } from '../lib/unstakeNftTask'; // New Import
import axios from 'axios';

const NftCard = ({ nft, stakedData, wallet, onDataRefresh }: any) => {
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);

    const isStaked = nft.staked;

    useEffect(() => {
        if (!isStaked || !stakedData?.stakedAt) return;

        const calculateTime = () => {
            const COOLDOWN_HOURS = 48;
            const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
            const expiryDate = new Date(stakedData.stakedAt).getTime() + cooldownMs;
            const now = new Date().getTime();
            const diff = expiryDate - now;

            if (diff <= 0) return "READY TO UNSTAKE";

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff / (1000 * 60)) % 60);
            const s = Math.floor((diff / 1000) % 60);
            return `${h}h ${m}m ${s}s`;
        };

        const timer = setInterval(() => setTimeLeft(calculateTime()), 1000);
        return () => clearInterval(timer);
    }, [isStaked, stakedData]);

    const handleStakeAction = async () => {
        const mint = nft.mint;
        setIsProcessing(true);
        try {
            const onChainResult = await stakeNftOnChain(wallet, mint);
            if (!onChainResult.success) throw new Error("On-chain stake failed");

            await axios.post('/api/staking/stake', {
                walletAddress: wallet.publicKey.toString(),
                mintAddress: mint,
                signature: onChainResult.signature
            });

            onDataRefresh();
        } catch (e) {
            console.error(e);
            alert("Staking failed. Check console.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUnstakeAction = async () => {
        if (timeLeft !== "READY TO UNSTAKE") return;

        setIsProcessing(true);
        try {
            // This calls the lib function we created earlier
            const result = await unstakeNftOnChain(wallet, nft.mint);
            if (result.success) {
                onDataRefresh(); // Refresh gallery to show NFT back in wallet
            }
        } catch (e) {
            console.error(e);
            alert("Unstaking failed. Check console.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-2 group hover:border-yellow-500/30 transition-all relative">
            {isStaked && (
                <div className="absolute top-3 left-3 z-10">
                    <div className="bg-black/80 backdrop-blur-md border border-yellow-500/50 text-yellow-500 text-[9px] font-bold px-2 py-1 rounded flex items-center gap-1">
                        <span>🔒</span> {timeLeft}
                    </div>
                </div>
            )}

            <div className="relative aspect-square bg-gray-900 rounded-xl overflow-hidden mb-3">
                <img
                    src={nft.image}
                    alt=""
                    className={`w-full h-full object-cover transition-all ${isStaked ? 'opacity-40 grayscale' : 'group-hover:scale-105'}`}
                />
            </div>

            <p className="text-[10px] font-black uppercase text-yellow-500 truncate px-1">{nft.name}</p>

            {isStaked ? (
                /* UNSTAKE BUTTON LOGIC */
                <button
                    onClick={handleUnstakeAction}
                    disabled={timeLeft !== "READY TO UNSTAKE" || isProcessing}
                    className={`w-full mt-2 py-2 rounded text-[10px] font-bold transition-all ${timeLeft === "READY TO UNSTAKE"
                            ? "bg-green-600 text-white hover:bg-green-500"
                            : "bg-white/10 text-gray-500 cursor-not-allowed"
                        }`}
                >
                    {isProcessing ? "PROCESSING..." : timeLeft === "READY TO UNSTAKE" ? "UNSTAKE" : "VAULT LOCKED"}
                </button>
            ) : (
                /* STAKE BUTTON LOGIC */
                <button
                    onClick={handleStakeAction}
                    disabled={isProcessing}
                    className="w-full mt-2 bg-yellow-500 text-black py-2 rounded text-[10px] font-bold hover:bg-yellow-400 disabled:opacity-50"
                >
                    {isProcessing ? "STAKING..." : "STAKE NFT"}
                </button>
            )}
        </div>
    );
};

export default function NftGallery() {
    const wallet = useWallet();
    const { publicKey } = wallet;
    const [nfts, setNfts] = useState<any[]>([]);
    const [rawStakes, setRawStakes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        if (!publicKey) return;
        setLoading(true);
        try {
            const res = await axios.get(`/api/staking/list?address=${publicKey.toString()}`);
            setNfts(res.data.nfts);
            setRawStakes(res.data.rawStakes);
        } catch (e) {
            console.error("Gallery Load Error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [publicKey]);

    if (!publicKey) return null;

    return (
        <div className="mt-12 max-w-6xl mx-auto px-4">
            <h3 className="text-xl font-black italic text-white uppercase mb-6">
                Your Assets <span className="text-yellow-500">({nfts.length})</span>
            </h3>
            {loading ? (
                <div className="text-white/20 font-black animate-pulse text-center py-10 uppercase tracking-widest">Accessing Secure Vault...</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {nfts.map((nft) => (
                        <NftCard
                            key={nft.mint}
                            nft={nft}
                            stakedData={rawStakes.find(s => s.mintAddress === nft.mint)}
                            wallet={wallet}
                            onDataRefresh={loadData}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}