import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useWallet } from '@solana/wallet-adapter-react';
import SeekerGuard from '../components/SeekerGuard';
import axios from 'axios';
import { Lock, Zap, Clock, ShieldCheck } from 'lucide-react';

export default function StakingPage() {
    const { publicKey } = useWallet();
    const [nfts, setNfts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        if (!publicKey) return;
        try {
            // This API returns all your NFTs and marks which ones are in the "StakedNFT" table
            const res = await axios.get(`/api/staking/list?address=${publicKey.toBase58()}`);
            setNfts(res.data.nfts);
        } catch (err) {
            console.error("Staking load error", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [publicKey]);

    const handleStake = async (mintAddress: string) => {
        try {
            setLoading(true);
            await axios.post('/api/staking/stake', {
                walletAddress: publicKey?.toBase58(),
                mintAddress
            });
            alert("NFT Locked Successfully! Cooldown period started.");
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Staking failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SeekerGuard>
            <div className="min-h-screen bg-black text-white font-sans pb-20">
                <Head><title>LAAMTAG | Secure Staking</title></Head>

                <main className="max-w-6xl mx-auto py-12 px-6">
                    <header className="text-center mb-16 space-y-4">
                        <h1 className="text-6xl font-black italic tracking-tighter text-yellow-500 uppercase">Vault Lock</h1>
                        <p className="text-gray-400 max-w-xl mx-auto uppercase text-xs font-bold tracking-[0.3em]">
                            Lock Genesis Tags for 500 LAAM & 10 TAG per NFT daily.
                        </p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <StatCard icon={<Lock className="text-yellow-500" />} label="Staked NFTs" value={nfts.filter(n => n.staked).length} />
                            <StatCard icon={<Clock className="text-blue-500" />} label="Cooldown" value="48 Hours" />
                            <StatCard icon={<Zap className="text-purple-500" />} label="Projected Yield" value={`${nfts.filter(n => n.staked).length * 500} LAAM`} />
                        </div>

                        {loading ? (
                            <div className="col-span-3 text-center py-20 animate-pulse text-gray-500 font-black tracking-widest">SCANNING BLOCKCHAIN...</div>
                        ) : nfts.length === 0 ? (
                            <div className="col-span-3 text-center py-20 bg-gray-900/50 rounded-3xl border border-dashed border-gray-800">
                                <p className="text-gray-500 uppercase font-bold tracking-widest">No Seeker NFTs detected.</p>
                            </div>
                        ) : (
                            nfts.map((nft) => (
                                <div key={nft.mint} className="bg-gray-900 border border-gray-800 rounded-[32px] overflow-hidden group hover:border-yellow-500/50 transition-all shadow-2xl">
                                    <div className="relative">
                                        <img src={nft.image} alt="NFT" className={`w-full aspect-square object-cover transition-opacity ${nft.staked ? 'opacity-40' : 'opacity-80 group-hover:opacity-100'}`} />
                                        {nft.staked && (
                                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                                <div className="bg-black/80 p-4 rounded-2xl border border-yellow-500 flex items-center gap-2 shadow-glow">
                                                    <ShieldCheck className="text-yellow-500" />
                                                    <span className="font-black italic text-yellow-500">VAULT LOCKED</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 space-y-4">
                                        <h3 className="font-black text-xl italic uppercase tracking-tight">{nft.name}</h3>
                                        {!nft.staked ? (
                                            <button
                                                onClick={() => handleStake(nft.mint)}
                                                className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-yellow-500 transition-all transform active:scale-95 uppercase text-xs tracking-widest"
                                            >
                                                Lock Asset
                                            </button>
                                        ) : (
                                            <div className="py-2 text-center">
                                                <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest animate-pulse">
                                                    Emitting Rewards
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </main>
            </div>
        </SeekerGuard>
    );
}

function StatCard({ icon, label, value }: any) {
    return (
        <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-[24px] flex items-center gap-4 hover:bg-gray-900 transition-colors">
            <div className="bg-black p-3 rounded-xl shadow-inner">{icon}</div>
            <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-black italic tracking-tighter">{value}</p>
            </div>
        </div>
    );
}