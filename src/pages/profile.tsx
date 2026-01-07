import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Coins, Trophy } from 'lucide-react';
import NftGallery from '../components/NftGallery'; // Ensure this path is correct

export default function ProfilePage() {
  const { publicKey } = useWallet();
  const [userData, setUserData] = useState<{ laamPoints: number; rank: string; personalMinted: number } | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    const address = publicKey.toString();

    // Fetch User Stats and History
    fetch(`/api/user/${address}`)
      .then(res => res.json())
      .then(statsData => {
        setUserData(statsData || null);
      })
      .catch(err => console.error("Profile fetch error", err));
  }, [publicKey]);

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans selection:bg-yellow-500/30">
      <div className="max-w-4xl mx-auto">

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

        {/* NFT GALLERY SECTION - Real Data Integrated */}
        <div className="mb-10">
          <h2 className="text-xs font-black mb-6 tracking-[0.3em] text-gray-400 uppercase flex items-center gap-3">
            <span className="h-[1px] w-8 bg-yellow-500/50"></span>
            My Genesis Collection
          </h2>

          {/* This component handles the fetching of your 7 NFTs and their countdowns */}
          <NftGallery />
        </div>
      </div>
    </div>
  );
}