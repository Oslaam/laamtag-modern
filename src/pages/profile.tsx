import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, LayoutGrid, Coins, Trophy } from 'lucide-react';

export default function ProfilePage() {
  const { publicKey } = useWallet();
  const [history, setHistory] = useState([]);
  // UPDATED: Added personalMinted to the type definition
  const [userData, setUserData] = useState<{ laamPoints: number; rank: string; personalMinted: number } | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    const address = publicKey.toString();

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
        
        {/* ... (Keep your existing Navigation and Header code) ... */}

        {/* POINTS & RANK SUMMARY CARD (Keep existing) */}
        <div className="grid grid-cols-2 gap-4 mb-10">
           {/* ... existing cards ... */}
        </div>

        {/* NEW: NFT GALLERY SECTION */}
        <div className="mb-10">
          <h2 className="text-xs font-black mb-6 tracking-[0.3em] text-gray-400 uppercase flex items-center gap-3">
            <span className="h-[1px] w-8 bg-yellow-500/50"></span>
            My Genesis Collection
          </h2>
          
          {userData?.personalMinted && userData.personalMinted > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(userData.personalMinted)].map((_, i) => (
                <div key={i} className="relative group aspect-square bg-gray-900 rounded-[2rem] border border-white/5 overflow-hidden hover:border-yellow-500/50 transition-all">
                  <img 
                    src="/assets/images/nft.gif" 
                    alt="Laamtag Box" 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                  />
                  <div className="absolute bottom-4 left-4">
                    <p className="text-[10px] font-black text-yellow-500 uppercase tracking-tighter">Box #000{i + 1}</p>
                    <p className="text-[8px] text-white/40 uppercase font-bold">Unrevealed</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/5 border border-dashed border-white/10 p-10 rounded-[2.5rem] text-center">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No NFTs Minted Yet</p>
              <Link href="/app" className="text-yellow-500 text-[10px] font-black uppercase mt-2 block hover:underline">
                Go to Mint →
              </Link>
            </div>
          )}
        </div>

        {/* HISTORY SECTION (Keep existing) */}
        {/* ... */}

      </div>
    </div>
  );
}