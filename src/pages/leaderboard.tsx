import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useWallet } from '@solana/wallet-adapter-react';
import { Trophy, Medal, Crown } from 'lucide-react';
import Navbar from '../components/Navbar';
import AppFooter from '../components/AppFooter';
import SeekerGuard from '../components/SeekerGuard';

export default function LeaderboardPage() {
  const { publicKey } = useWallet();
  const [leaders, setLeaders] = useState([]);
  const [myStats, setMyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const url = publicKey 
          ? `/api/leaderboard?address=${publicKey.toString()}` 
          : '/api/leaderboard';
          
        const res = await fetch(url);
        const data = await res.json();
        setLeaders(data.topUsers);
        setMyStats(data.userRank); // Adjusted to match your API return key
      } catch (err) {
        console.error("Leaderboard fetch error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [publicKey]);

  return (
    <SeekerGuard>
      <div className="min-h-screen bg-black text-white font-sans pb-48">
        <Head><title>LAAMTAG | Leaderboard</title></Head>
        <Navbar />

        <main className="max-w-4xl mx-auto py-12 px-6">
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-5xl font-black italic tracking-tighter text-yellow-500 uppercase">
              Hall of Seekers
            </h1>
            <p className="text-gray-400">The top contributors in the Seeker Universe.</p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-[40px] overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="grid grid-cols-4 p-6 border-b border-gray-800 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
              <span>Rank</span>
              <span className="col-span-2">Seeker</span>
              <span className="text-right">Points</span>
            </div>

            {loading ? (
              <div className="p-20 text-center text-gray-600 animate-pulse uppercase font-black tracking-widest">Loading Legends...</div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {leaders.map((leader: any, index: number) => {
                  const isUser = leader.walletAddress === publicKey?.toString();
                  const rank = index + 1;

                  return (
                    <div 
                      key={leader.walletAddress} 
                      className={`grid grid-cols-4 p-6 items-center transition-colors hover:bg-white/[0.02] ${isUser ? 'bg-yellow-500/5' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        {rank === 1 && <Crown size={20} className="text-yellow-500" />}
                        {rank === 2 && <Medal size={20} className="text-gray-400" />}
                        {rank === 3 && <Medal size={20} className="text-orange-400" />}
                        <span className={`font-black ${rank <= 3 ? 'text-lg' : 'text-gray-500'}`}>
                          #{rank}
                        </span>
                      </div>

                      <div className="col-span-2 flex items-center gap-2">
                        <span className={`font-bold ${isUser ? 'text-yellow-500' : 'text-white'}`}>
                          {leader.walletAddress.slice(0, 4)}...{leader.walletAddress.slice(-4)}.skr
                        </span>
                        {leader.tier === "Diamond" && <span className="text-[8px] border border-cyan-400 text-cyan-400 px-2 py-0.5 rounded-full font-black">DIAMOND</span>}
                      </div>

                      <div className="text-right font-mono font-bold text-yellow-500">
                        {leader.laamPoints.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* --- DYNAMIC HIGHLIGHT BAR --- */}
        {publicKey && myStats && (
          <div className="fixed bottom-28 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-yellow-500 rounded-3xl p-5 shadow-[0_0_50px_rgba(234,179,8,0.4)] z-40 transition-all hover:scale-[1.02]">
            <div className="flex justify-between items-center text-black px-4">
              <div className="flex items-center gap-4">
                <div className="bg-black text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl italic">
                  #{myStats.rank}
                </div>
                <div>
                  <p className="text-[10px] font-black opacity-60 uppercase tracking-tighter">Your Standing</p>
                  <p className="font-black text-lg uppercase italic leading-none">Seeker Status</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-black opacity-60 uppercase tracking-tighter">Current Balance</p>
                <p className="font-black text-2xl italic leading-none">{myStats.laamPoints?.toLocaleString()} <span className="text-sm">LAAM</span></p>
              </div>
            </div>
          </div>
        )}

        <AppFooter />
      </div>
    </SeekerGuard>
  );
}