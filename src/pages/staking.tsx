import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useWallet } from '@solana/wallet-adapter-react';
import SeekerGuard from '../components/SeekerGuard';
import axios from 'axios';
import { Lock, Zap, Clock, History } from 'lucide-react';
import { stakeNftOnChain } from '../lib/stakeNftTask';

const RewardTicker = ({ stakedAt }: { stakedAt: string }) => {
    const [rewards, setRewards] = useState({ laam: 0, tag: 0 });
    const LAAM_PER_SEC = 500 / 86400;
    const TAG_PER_SEC = 20 / 86400;

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const start = new Date(stakedAt).getTime();
            // Reward calculation starts after 48h lock
            const secondsElapsed = Math.max(0, Math.floor((now - start) / 1000) - (48 * 3600));

            setRewards({
                laam: secondsElapsed * LAAM_PER_SEC,
                tag: secondsElapsed * TAG_PER_SEC
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [stakedAt]);

    return (
        <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-black/40 p-2 rounded-lg border border-yellow-500/20">
                <p className="text-[8px] text-gray-500 uppercase font-black">LAAM</p>
                <p className="text-yellow-500 font-black tabular-nums">{rewards.laam.toFixed(4)}</p>
            </div>
            <div className="bg-black/40 p-2 rounded-lg border border-white/10">
                <p className="text-[8px] text-gray-500 uppercase font-black">TAG</p>
                <p className="text-white font-black tabular-nums">{rewards.tag.toFixed(4)}</p>
            </div>
        </div>
    );
};

export default function StakingPage() {
    const wallet = useWallet();
    const { publicKey } = wallet;
    const [nfts, setNfts] = useState<any[]>([]);
    const [rawStakes, setRawStakes] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [totalClaimed, setTotalClaimed] = useState({ laam: 0, tag: 0 });
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        if (!publicKey) return;
        try {
            await axios.post('/api/staking/sync', { walletAddress: publicKey.toBase58() });
            const [listRes, historyRes] = await Promise.all([
                axios.get(`/api/staking/list?address=${publicKey.toBase58()}`),
                axios.get(`/api/staking/history?address=${publicKey.toBase58()}`)
            ]);
            setNfts(listRes.data.nfts);
            setRawStakes(listRes.data.rawStakes || []);
            setTotalClaimed(historyRes.data.totals);
            setHistory(historyRes.data.history);
        } catch (err) {
            console.error("Staking load error", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [publicKey]);

    const handleAction = async (nft: any) => {
        setLoading(true);
        try {
            if (!nft.staked) {
                const result = await stakeNftOnChain(wallet, nft.mint);
                if (result.success) {
                    await axios.post('/api/staking/stake', {
                        walletAddress: publicKey?.toBase58(),
                        mintAddress: nft.mint,
                        signature: result.signature
                    });
                }
            } else {
                const response = await axios.post('/api/staking/unstake', {
                    walletAddress: publicKey?.toBase58(),
                    mintAddress: nft.mint
                });
                if (response.data.success) {
                    console.log("Unstake successful");
                }
            }
            await loadData();
        } catch (err: any) {
            console.error("Action Error:", err);
            alert(err.response?.data?.message || "Action failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SeekerGuard>
            <div className="text-white font-sans pb-20">
                <Head><title>LAAMTAG | Vault</title></Head>
                <main className="max-w-6xl mx-auto py-12 px-6">
                    <header className="text-center mb-16 space-y-4">
                        <h1 className="text-6xl font-black italic tracking-tighter text-yellow-500 uppercase">Vault Lock</h1>
                        <p className="text-gray-400 max-w-xl mx-auto uppercase text-xs font-bold tracking-[0.3em]">
                            Lock Genesis Tags for 500 LAAM & 20 TAG daily.
                        </p>
                    </header>

                    <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                        <StatCard icon={<Lock className="text-yellow-500" />} label="Staked NFTs" value={nfts.filter(n => n.staked).length} />
                        <StatCard icon={<Clock className="text-blue-500" />} label="Cooldown" value="48 Hours" />
                        <StatCard
                            icon={<Zap className="text-purple-500" />}
                            label="Total Claimed"
                            value={`${totalClaimed.laam.toFixed(0)} LAAM / ${totalClaimed.tag.toFixed(0)} TAG`}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {nfts.map((nft) => {
                            const stakeData = rawStakes.find(s => s.mintAddress === nft.mint);
                            return (
                                <div key={nft.mint} className="bg-gray-900 border border-gray-800 rounded-[32px] overflow-hidden group hover:border-yellow-500/50 transition-all shadow-2xl">
                                    <div className="relative">
                                        <img src={nft.image} alt={nft.name} className={`w-full aspect-square object-cover ${nft.staked ? 'opacity-40 grayscale' : ''}`} />
                                        {nft.staked && (
                                            <div className="absolute top-4 right-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-[10px] font-black italic shadow-glow">
                                                LOCKED
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-6">
                                        <h3 className="font-black text-xl italic uppercase mb-2">{nft.name}</h3>
                                        {nft.staked && stakeData ? (
                                            <RewardTicker stakedAt={stakeData.stakedAt} />
                                        ) : (
                                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Not currently earning</p>
                                        )}
                                        <button
                                            disabled={loading}
                                            onClick={() => handleAction(nft)}
                                            className={`w-full mt-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${nft.staked ? 'bg-white/10 text-gray-400' : 'bg-yellow-500 text-black hover:bg-yellow-400'} disabled:opacity-50`}
                                        >
                                            {loading ? "Processing..." : nft.staked ? "Vault Locked" : "Lock Asset"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-16 bg-gray-900/50 border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-6 text-yellow-500">
                            <History size={20} />
                            <h2 className="text-xl font-black italic uppercase tracking-tighter">Recent Claim Activity</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-gray-500 border-b border-white/10 text-[10px] uppercase font-black">
                                    <tr>
                                        <th className="pb-4">Date</th>
                                        <th className="pb-4">NFT Mint</th>
                                        <th className="pb-4 text-right">LAAM</th>
                                        <th className="pb-4 text-right">TAG</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-bold">
                                    {history.length > 0 ? history.map((item) => (
                                        <tr key={item.id} className="text-sm">
                                            <td className="py-4 text-gray-400">{new Date(item.unstakedAt).toLocaleDateString()}</td>
                                            <td className="py-4 font-mono text-gray-600">{item.mintAddress.slice(0, 4)}...{item.mintAddress.slice(-4)}</td>
                                            <td className="py-4 text-right text-yellow-500">+{item.laamEarned.toFixed(2)}</td>
                                            <td className="py-4 text-right text-white">+{item.tagEarned.toFixed(2)}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="py-10 text-center text-gray-600 uppercase text-xs tracking-widest font-black">No claim history found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
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