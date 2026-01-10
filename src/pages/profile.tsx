import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Coins, Trophy } from 'lucide-react';
import NftGallery from '../components/NftGallery';

export default function ProfilePage() {
  const { publicKey } = useWallet();
  const [userData, setUserData] = useState<{ laamPoints: number; rank: string; personalMinted: number } | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    fetch(`/api/user/${publicKey.toString()}`)
      .then(res => res.json())
      .then(statsData => setUserData(statsData || null))
      .catch(err => console.error("Profile fetch error", err));
  }, [publicKey]);

  return (
    <div className="py-6">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between mb-12">
        <Link href="/" className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        </Link>
        <div className="text-right">
          <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em]">Seeker Profile</p>
          <p className="font-mono text-[9px] text-gray-500">{publicKey?.toString().slice(0, 12)}...</p>
        </div>
      </div>

      {/* STATS SUMMARY */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem]">
          <Coins className="text-yellow-500 mb-2" size={20} />
          <p className="text-2xl font-black italic">{userData?.laamPoints?.toLocaleString() || 0}</p>
          <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Total LAAM</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem]">
          <Trophy className="text-yellow-500 mb-2" size={20} />
          <p className="text-2xl font-black italic uppercase">{userData?.rank || 'NEOPHYTE'}</p>
          <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Current Rank</p>
        </div>
      </div>

      {/* NFT GALLERY SECTION */}
      <div className="mb-20">
        <h2 className="text-[10px] font-black mb-6 tracking-[0.3em] text-gray-400 uppercase flex items-center gap-3">
          <span className="h-[1px] w-8 bg-yellow-500/50"></span>
          My Genesis Collection
        </h2>
        <NftGallery />
      </div>
    </div>
  );
}