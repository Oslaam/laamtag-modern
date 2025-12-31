import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Sidebar() {
  const [activeQuests, setActiveQuests] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const res = await fetch('/api/quests/count');
      const data = await res.json();
      setActiveQuests(data.count || 0);
    };
    fetchCount();
  }, []);

  return (
    <div className="w-64 bg-gray-900 h-screen p-6 border-r border-gray-800 hidden md:block">
      <h2 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-8">Navigation</h2>
      
      <nav className="space-y-4">
        <Link href="/quests" className="flex justify-between items-center group text-gray-300 hover:text-yellow-500 transition-colors">
          <span className="font-bold">Quests</span>
          <span className="bg-yellow-500/10 text-yellow-500 text-[10px] px-2 py-1 rounded-full border border-yellow-500/20 group-hover:bg-yellow-500 group-hover:text-black transition-all">
            {activeQuests} ACTIVE
          </span>
        </Link>
        
        <Link href="/leaderboard" className="block font-bold text-gray-300 hover:text-yellow-500 transition-colors">
          Leaderboard
        </Link>
        
        <Link href="/profile" className="block font-bold text-gray-300 hover:text-yellow-500 transition-colors">
          My Vault
        </Link>
      </nav>

      <div className="mt-auto pt-10">
        <div className="bg-yellow-500/5 p-4 rounded-2xl border border-yellow-500/10">
          <p className="text-[10px] text-yellow-500 font-bold uppercase">Pro Tip</p>
          <p className="text-xs text-gray-400 mt-1">Complete "Limited" quests first to secure your LAAM!</p>
        </div>
      </div>
    </div>
  );
}