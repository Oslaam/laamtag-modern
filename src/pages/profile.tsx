import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, LayoutGrid, Coins, Trophy } from 'lucide-react';

export default function ProfilePage() {
  const { publicKey } = useWallet();
  const [history, setHistory] = useState([]);
  const [userData, setUserData] = useState<{ laamPoints: number; rank: string } | null>(null);

  useEffect(() => {
    if (!publicKey) return; // Stop if wallet not connected

    const address = publicKey.toString();

    // Use Promise.all to fetch both at once for speed
    Promise.all([
      fetch(`/api/user/history?address=${address}`).then(res => res.json()),
      fetch(`/api/user/${address}`).then(res => res.json())
    ]).then(([historyData, statsData]) => {
      setHistory(historyData || []);
      setUserData(statsData || null);
    }).catch(err => console.error("Profile fetch error", err));

  }, [publicKey]);

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans selection:bg-yellow-500/30">
      <div className="max-w-2xl mx-auto">

        {/* TOP NAVIGATION */}
        <div className="flex justify-between items-center mb-10">
          <Link href="/quests" className="flex items-center gap-2 text-gray-500 hover:text-yellow-500 transition-all font-bold text-xs uppercase tracking-[0.2em]">
            <ArrowLeft size={16} />
            Back to Hub
          </Link>

          <Link href="/app" className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl font-bold text-xs uppercase hover:bg-white/10 transition-all">
            <LayoutGrid size={14} className="text-yellow-500" />
            Launch App
          </Link>
        </div>

        {/* PROFILE HEADER */}
        <div className="text-center mb-10">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 bg-yellow-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-gradient-to-b from-gray-800 to-black border-2 border-yellow-500/50 rounded-full flex items-center justify-center text-yellow-500 font-black text-3xl shadow-2xl">
              {publicKey?.toString().slice(0, 2)}
            </div>
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-white">
            {publicKey?.toString().slice(0, 4)}.skr
          </h1>
          <p className="text-gray-500 font-mono text-[10px] mt-1 tracking-widest opacity-60">
            {publicKey?.toString()}
          </p>
        </div>

        {/* NEW: POINTS & RANK SUMMARY CARD */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 p-6 rounded-[2rem] shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Coins size={18} className="text-yellow-500" />
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Vault Balance</span>
            </div>
            <p className="text-3xl font-black text-white">
              {userData?.laamPoints?.toLocaleString() || 0}
              <span className="text-xs text-yellow-500 ml-2">LAAM</span>
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 p-6 rounded-[2rem] shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Trophy size={18} className="text-purple-500" />
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Global Rank</span>
            </div>
            <p className="text-3xl font-black text-white italic uppercase tracking-tighter">
              {userData?.rank || "Bronze"}
            </p>
          </div>
        </div>

        {/* HISTORY SECTION */}
        <div className="bg-gray-900/30 border border-gray-800/50 rounded-[2.5rem] p-8 backdrop-blur-md">
          <h2 className="text-xs font-black mb-8 tracking-[0.3em] text-gray-400 uppercase flex items-center gap-3">
            <span className="h-[1px] w-8 bg-yellow-500/50"></span>
            Transaction History
          </h2>

          <div className="space-y-4">
            {history.map((h: any) => (
              <div key={h.id} className="group bg-black/40 p-5 rounded-2xl flex justify-between items-center border border-white/5 hover:border-yellow-500/20 transition-all duration-300">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-gray-100 group-hover:text-yellow-500 transition-colors">{h.quest.title}</span>
                  <span className="text-[9px] text-gray-600 font-mono uppercase tracking-tighter">Verified: {new Date(h.completedAt).toLocaleDateString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-yellow-500 font-black font-mono block">+{h.quest.reward}</span>
                  <span className="text-[8px] text-gray-600 font-bold uppercase">Points Added</span>
                </div>
              </div>
            ))}

            {history.length === 0 && (
              <div className="text-center py-16">
                <div className="w-12 h-12 bg-gray-800/50 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Coins size={20} className="text-gray-600" />
                </div>
                <p className="text-gray-600 text-xs font-medium tracking-widest uppercase">Vault Empty</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}