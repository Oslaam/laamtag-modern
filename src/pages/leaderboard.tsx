import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useWallet } from '@solana/wallet-adapter-react';
import { Trophy, Medal, Crown } from 'lucide-react';
import Navbar from '../components/Navbar';
import AppFooter from '../components/AppFooter';
import SeekerGuard from '../components/SeekerGuard';
import { getRank } from '../utils/ranks';

// Types for better development
interface LeaderboardUser {
  walletAddress: string;
  laamPoints: number;
  tier: string;
  completedQuestsCount: number;
}

interface UserStanding extends LeaderboardUser {
  rank: number;
}

export default function LeaderboardPage() {
  const { publicKey } = useWallet();
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [myStats, setMyStats] = useState<UserStanding | null>(null);
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
        setMyStats(data.userRank); 
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
      <div className="min-h-screen bg-black text-white font-sans pb-64">
        <Head><title>LAAMTAG | Leaderboard</title></Head>
        <Navbar />

        <main className="max-w-4xl mx-auto py-12 px-6">
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-5xl font-black italic tracking-tighter text-yellow-500 uppercase">
              Hall of Seekers
            </h1>
            <p className="text-gray-400 font-medium uppercase tracking-widest text-xs">
              The top contributors in the Seeker Universe
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-[40px] overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="grid grid-cols-12 p-6 border-b border-gray-800 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
              <div className="col-span-2 text-center">Rank</div>
              <div className="col-span-5">Seeker</div>
              <div className="col-span-2 text-center">Tier</div>
              <div className="col-span-3 text-right">Points</div>
            </div>

            {loading ? (
              <div className="p-20 text-center text-gray-600 animate-pulse uppercase font-black tracking-widest">
                Loading Legends...
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {leaders.map((leader, index) => {
                  const isUser = leader.walletAddress === publicKey?.toString();
                  const rank = index + 1;

                  return (
                    <div
                      key={leader.walletAddress}
                      className={`grid grid-cols-12 p-6 items-center transition-colors hover:bg-white/[0.02] ${
                        isUser ? 'bg-yellow-500/5' : ''
                      }`}
                    >
                      {/* Rank Column */}
                      <div className="col-span-2 flex items-center justify-center gap-2">
                        {rank === 1 && <Crown size={18} className="text-yellow-500" />}
                        {rank === 2 && <Medal size={18} className="text-gray-400" />}
                        {rank === 3 && <Medal size={18} className="text-orange-400" />}
                        <span className={`font-black ${rank <= 3 ? 'text-xl italic' : 'text-gray-500'}`}>
                          #{rank}
                        </span>
                      </div>

                      {/* Address Column */}
                      <div className="col-span-5 flex items-center gap-2">
                        <span className={`font-bold font-mono ${isUser ? 'text-yellow-500' : 'text-white'}`}>
                          {leader.walletAddress.slice(0, 4)}...{leader.walletAddress.slice(-4)}.skr
                        </span>
                        {isUser && (
                          <span className="text-[8px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-black uppercase">
                            You
                          </span>
                        )}
                      </div>

                      {/* Tier Column */}
                      <div className="col-span-2 text-center">
                        <span className="text-[9px] border border-gray-700 text-gray-400 px-2 py-1 rounded-full font-black uppercase tracking-tighter">
                          {leader.tier}
                        </span>
                      </div>

                      {/* Points Column */}
                      <div className="col-span-3 text-right font-mono font-black text-yellow-500 text-lg">
                        {leader.laamPoints.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* --- DYNAMIC HIGHLIGHT BAR (User Standing) --- */}
        {publicKey && myStats && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl rounded-[32px] p-5 shadow-2xl z-40 transition-all hover:scale-[1.01] bg-yellow-500">
            <div className="flex justify-between items-center text-black px-2">
              <div className="flex items-center gap-4">
                <div className="bg-black text-white w-14 h-14 rounded-2xl flex flex-col items-center justify-center">
                  <span className="text-[8px] font-black uppercase leading-none opacity-60">Rank</span>
                  <span className="font-black text-2xl italic leading-none">#{myStats.rank}</span>
                </div>
                <div>
                  <p className="text-[10px] font-black opacity-60 uppercase tracking-tighter">Your Standing</p>
                  <p className="font-black text-xl uppercase italic leading-none">
                    {getRank(myStats.laamPoints).name} SEEKER
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black opacity-60 uppercase tracking-tighter">Current Balance</p>
                <p className="font-black text-3xl italic leading-none">
                  {myStats.laamPoints?.toLocaleString()} <span className="text-sm">LAAM</span>
                </p>
              </div>
            </div>
          </div>
        )}

        <AppFooter />
      </div>
    </SeekerGuard>
  );
}