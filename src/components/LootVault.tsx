import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { Coins, Wallet, Loader2 } from 'lucide-react';

export default function LootVault() {
    const { publicKey } = useWallet();
    const [pending, setPending] = useState({ sol: 0, usdc: 0 });
    const [loading, setLoading] = useState(false);
    const [claiming, setClaiming] = useState<string | null>(null);

    const fetchLoot = async () => {
        if (!publicKey) return;
        try {
            const res = await axios.get(`/api/user/pending-loot?address=${publicKey.toBase58()}`);
            const rewards = res.data.rewards;

            // Calculate totals
            const solTotal = rewards.filter((r: any) => r.asset === 'SOL').reduce((a: number, b: any) => a + b.amount, 0);
            const usdcTotal = rewards.filter((r: any) => r.asset === 'USDC').reduce((a: number, b: any) => a + b.amount, 0);

            setPending({ sol: solTotal, usdc: usdcTotal });
        } catch (err) {
            console.error("Failed to fetch loot", err);
        }
    };

    useEffect(() => { fetchLoot(); }, [publicKey]);

    const handleClaim = async (assetType: 'SOL' | 'USDC') => {
        if (!publicKey) return;
        setClaiming(assetType);
        try {
            const res = await axios.post('/api/user/claim-rewards', {
                walletAddress: publicKey.toBase58(),
                assetType: assetType
            });
            alert(res.data.message);
            fetchLoot(); // Refresh the numbers
        } catch (err: any) {
            alert(err.response?.data?.message || "Claim failed");
        } finally {
            setClaiming(null);
        }
    };

    if (!publicKey) return null;

    return (
        <div className="bg-gray-900 border border-yellow-500/20 rounded-3xl p-6 mt-8">
            <h2 className="text-xl font-black italic uppercase text-yellow-500 mb-6 flex items-center gap-2">
                <Coins /> Unclaimed Loot
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SOL CARD */}
                <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Pending SOL</p>
                    <p className="text-2xl font-black text-white mb-4">{pending.sol.toFixed(3)} SOL</p>
                    <button
                        disabled={pending.sol <= 0 || claiming !== null}
                        onClick={() => handleClaim('SOL')}
                        className="w-full py-2 bg-yellow-500 text-black text-xs font-black uppercase rounded-xl disabled:opacity-20"
                    >
                        {claiming === 'SOL' ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Claim SOL"}
                    </button>
                </div>

                {/* USDC CARD */}
                <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Pending USDC</p>
                    <p className="text-2xl font-black text-blue-400 mb-4">${pending.usdc.toFixed(2)}</p>
                    <button
                        disabled={pending.usdc <= 0 || claiming !== null}
                        onClick={() => handleClaim('USDC')}
                        className="w-full py-2 bg-blue-500 text-white text-xs font-black uppercase rounded-xl disabled:opacity-20"
                    >
                        {claiming === 'USDC' ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Claim USDC"}
                    </button>
                </div>
            </div>
        </div>
    );
}