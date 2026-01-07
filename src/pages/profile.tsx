import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, LayoutGrid, Coins, Trophy, Lock } from 'lucide-react';

export default function ProfilePage() {
  const { publicKey } = useWallet();
  const [history, setHistory] = useState([]);
  const [userData, setUserData] = useState<{ laamPoints: number; rank: string; personalMinted: number } | null>(null);

  // NEW: State for staked/locked NFTs
  const [stakedMints, setStakedMints] = useState<string[]>([]);

  useEffect(() => {
    if (!publicKey) return;
    const address = publicKey.toString();

    // Fetch User Stats, History, and Staking status in parallel
    Promise.all([
      fetch(`/api/user/history?address=${address}`).then(res => res.json()),
      fetch(`/api/user/${address}`).then(res => res.json()),
      fetch(`/api/staking/list?address=${address}`).then(res => res.json())
    ]).then(([historyData, statsData, stakingData]) => {
      setHistory(historyData || []);
      setUserData(statsData || null);
      setStakedMints(stakingData.stakedMintAddresses || []);
    }).catch(err => console.error("Profile fetch error", err));
  }, [publicKey]);

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans selection:bg-yellow-500/30">
      <div className="max-w-2xl mx-auto">

        {/* HEADER SECTION */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/app" className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="text-right">
            <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em]">Seeker Profile</p>
            <p className="font-mono text-[10px] text-gray-500">{publicKey?.toString().slice(0, 8)}...</p>
          </div>
        </div>

        {/* STATS SUMMARY */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem]">
            <Coins className="text-yellow-500 mb-2" size={20} />
            <p className="text-2xl font-black italic">{userData?.laamPoints?.toLocaleString() || 0}</p>
            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest text-white/40">Total LAAM</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem]">
            <Trophy className="text-yellow-500 mb-2" size={20} />
            <p className="text-2xl font-black italic uppercase">{userData?.rank || 'NEOPHYTE'}</p>
            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest text-white/40">Current Rank</p>
          </div>
        </div>

        {/* NFT GALLERY SECTION */}
        <div className="mb-10">
          <h2 className="text-xs font-black mb-6 tracking-[0.3em] text-gray-400 uppercase flex items-center gap-3">
            <span className="h-[1px] w-8 bg-yellow-500/50"></span>
            My Genesis Collection
          </h2>

          {userData?.personalMinted && userData.personalMinted > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(userData.personalMinted)].map((_, i) => {
                // For now, we simulate Mint IDs. Once you have real metadata, replace this with nft.mintAddress
                const mockMintId = `MINT_ID_${i}`;
                const isLocked = stakedMints.includes(mockMintId);

                return (
                  <div key={i} className="relative group aspect-square bg-gray-900 rounded-[2rem] border border-white/5 overflow-hidden hover:border-yellow-500/50 transition-all">
                    <img
                      src="/assets/images/nft.gif"
                      alt="Laamtag Box"
                      className={`w-full h-full object-cover transition-all duration-500 ${isLocked ? 'grayscale opacity-30 scale-95' : 'opacity-80 group-hover:opacity-100 group-hover:scale-110'}`}
                    />

                    {isLocked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-2xl flex items-center gap-1">
                          <Lock size={10} /> Vault Locked
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4">
                      <p className="text-[10px] font-black text-yellow-500 uppercase tracking-tighter">Box #000{i + 1}</p>
                      {!isLocked ? (
                        <Link href="/staking" className="text-[8px] text-white/40 hover:text-yellow-500 uppercase font-bold transition-colors">
                          Stake to Earn →
                        </Link>
                      ) : (
                        <p className="text-[8px] text-white/20 uppercase font-bold">Staked</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white/5 border border-dashed border-white/10 p-10 rounded-[2.5rem] text-center">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No NFTs Minted Yet</p>
              <Link href="/mint" className="text-yellow-500 text-[10px] font-black uppercase mt-2 block hover:underline">
                Go to Mint →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}