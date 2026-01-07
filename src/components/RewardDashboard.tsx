import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

export default function RewardDashboard() {
    const { publicKey } = useWallet();
    const [data, setData] = useState({ history: [], pending: [] });

    const fetchData = async () => {
        if (!publicKey) return;
        const res = await fetch(`/api/user/rewards?walletAddress=${publicKey.toBase58()}`);
        const json = await res.json();
        setData(json);
    };

    const handleClaim = async (id: string) => {
        const res = await fetch('/api/user/rewards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress: publicKey?.toBase58(), action: 'claim', rewardId: id })
        });

        if (res.ok) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#eab308', '#ffffff', '#ef4444']
            });
            toast.success("REWARD SECURED IN VAULT");
            fetchData();
        }
    };

    useEffect(() => { fetchData(); }, [publicKey]);

    return (
        <div className="w-full max-w-md mt-10 space-y-4">
            {/* Pending SOL/USDC Claims */}
            {data.pending.length > 0 && (
                <div className="bg-gradient-to-r from-yellow-500/20 to-transparent border-l-4 border-yellow-500 p-4 rounded-r-xl">
                    <h3 className="text-yellow-500 font-black text-[10px] uppercase tracking-widest mb-2">Claimable Assets</h3>
                    {data.pending.map((r: any) => (
                        <div key={r.id} className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/5 mb-2">
                            <span className="text-white font-black italic">{r.amount} {r.asset}</span>
                            <button onClick={() => handleClaim(r.id)} className="bg-white text-black px-4 py-1 rounded font-black text-[10px] hover:bg-yellow-400 transition-colors">CLAIM</button>
                        </div>
                    ))}
                </div>
            )}

            {/* General History Table */}
            <div className="bg-[#0a0a0a] rounded-3xl border border-white/5 p-6 shadow-2xl">
                <h3 className="text-gray-500 font-black uppercase text-[10px] mb-4 tracking-tighter italic">Ledger / History</h3>
                <div className="space-y-4 overflow-y-auto max-h-60 pr-2 custom-scrollbar">
                    {data.history.map((h: any) => (
                        <div key={h.id} className="flex justify-between items-center text-[11px] border-b border-white/5 pb-2">
                            <div>
                                <p className="text-white font-bold tracking-tight uppercase">{h.type.replace('_', ' ')}</p>
                                <p className="text-gray-600 text-[9px]">{new Date(h.createdAt).toLocaleDateString()}</p>
                            </div>
                            <span className={h.amount >= 0 ? "text-yellow-500 font-black" : "text-red-500 font-black"}>
                                {h.amount >= 0 ? '+' : ''}{h.amount} {h.asset}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}