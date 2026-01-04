import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Sidebar from '../components/Sidebar'; 
import AppFooter from '../components/AppFooter';
import SeekerGuard from '../components/SeekerGuard';
import GuessGameComponent from '../components/GuessGame';

export default function QuestsPage() {
  const { publicKey } = useWallet();
  const [userPoints, setUserPoints] = useState(0);
  const [dbQuests, setDbQuests] = useState([]); 
  const [questStatuses, setQuestStatuses] = useState<Record<string, string>>({});
  const [isClaiming, setIsClaiming] = useState<string | null>(null);
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState("");

  // 1. Daily Reset Countdown Logic
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const resetTime = new Date();
      resetTime.setHours(23, 59, 59, 999); 
      const diff = resetTime.getTime() - now.getTime();
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch Data
  const fetchData = async () => {
    try {
      const questRes = await fetch('/api/get-quests');
      const questData = await questRes.json();
      // Ensure we only set unique quests by ID to prevent double-rendering
      const uniqueQuests = Array.from(new Map(questData.map((item: any) => [item.id, item])).values());
      setDbQuests(uniqueQuests as any);

      if (publicKey) {
        const address = publicKey.toString();
        const userRes = await fetch(`/api/user/${address}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          setUserPoints(userData.laamPoints || 0);
        }

        const historyRes = await fetch(`/api/user/history?address=${address}`);
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          const statusMap = historyData.reduce((acc: any, item: any) => {
            acc[item.questId] = item.status;
            return acc;
          }, {});
          setQuestStatuses(statusMap);
        }
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [publicKey]);

  const claimQuest = async (questId: string, reward: number, type: string) => {
    if (!publicKey) return toast.error("Connect wallet first!");
    setIsClaiming(questId);

    try {
      let endpoint = '/api/complete-quest';
      let body: any = { walletAddress: publicKey.toString(), questId, pointsReward: reward };

      if (type === 'social') {
        endpoint = '/api/submit-social';
        body.proofLink = proofs[questId];
        if (!body.proofLink) {
          toast.error("Please paste your X link!");
          setIsClaiming(null);
          return;
        }
      } else if (type === 'daily') {
        endpoint = '/api/checkin';
      } else if (type === 'nft') {
        endpoint = '/api/claim-nft-reward'; 
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || `Action successful!`);
        await fetchData();
        if (type === 'social') setProofs(prev => ({ ...prev, [questId]: "" }));
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsClaiming(null);
    }
  };

  const getTierInfo = (points: number) => {
    if (points >= 20000) return { name: "Diamond", color: "text-cyan-400", next: 20000 };
    if (points >= 10001) return { name: "Gold", color: "text-yellow-400", next: 20000 };
    if (points >= 5001) return { name: "Silver", color: "text-gray-300", next: 10000 };
    return { name: "Bronze", color: "text-orange-400", next: 5000 };
  };

  const tier = getTierInfo(userPoints);
  const progress = Math.min((userPoints / tier.next) * 100, 100);
  const displayName = publicKey ? `${publicKey.toString().slice(0, 4)}.skr` : "Seeker";

  return (
    <SeekerGuard>
      <div className="flex bg-black min-h-screen pb-32">
        <Sidebar /> 
        <main className="flex-1 overflow-y-auto p-8 text-white font-sans">
          <Toaster />
          <nav className="flex justify-between items-center mb-12 max-w-4xl mx-auto">
            <h1 className="text-3xl font-black italic tracking-tighter text-yellow-500 uppercase">
              {displayName} HUB
            </h1>
            <WalletMultiButton />
          </nav>

          <div className="max-w-2xl mx-auto">
            {/* VAULT STATS CARDS */}
            <div className="bg-gray-900 p-8 rounded-3xl mb-10 border border-gray-800 shadow-2xl">
              <div className="text-center">
                <p className="text-gray-500 text-xs font-bold tracking-[0.2em] uppercase mb-2">Vault Balance</p>
                <p className="text-5xl font-black text-white">{userPoints.toLocaleString()} <span className="text-yellow-500 text-2xl ml-1">LAAM</span></p>
              </div>
              <div className="mt-8">
                <div className="flex justify-between text-[10px] font-bold mb-2">
                  <span className={`${tier.color} uppercase tracking-widest`}>{tier.name} TIER</span>
                  <span className="text-gray-500 uppercase">{userPoints.toLocaleString()} / {tier.next.toLocaleString()} LAAM</span>
                </div>
                <div className="w-full bg-black h-3 rounded-full border border-gray-800 p-0.5">
                  <div className="bg-yellow-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            {/* QUEST LIST SECTION */}
            <div className="space-y-4 mb-20">
              <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest ml-2">Active Quests</h2>
              {dbQuests.map((quest: any) => {
                const status = questStatuses[quest.id];
                const isPending = status === 'PENDING';
                const isApproved = status === 'APPROVED' || status === 'COMPLETED';
                
                return (
                  <div key={quest.id} className={`bg-gray-900 p-6 rounded-2xl border transition-all ${isApproved ? 'border-green-500/20 opacity-70' : 'border-gray-800 hover:border-yellow-500/30'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className={`font-bold text-lg ${isApproved ? 'text-gray-500 line-through' : 'text-gray-100'}`}>{quest.title}</h3>
                        <div className="flex gap-3 items-center">
                          <p className={`${isApproved ? 'text-gray-600' : 'text-yellow-500'} font-mono font-bold`}>+{quest.reward} LAAM</p>
                          {quest.type === 'daily' && (
                            <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20 font-bold uppercase">
                              RESETS IN: {timeLeft}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => claimQuest(quest.id, quest.reward, quest.type)}
                        disabled={isClaiming === quest.id || isPending || isApproved}
                        className={`px-6 py-2 rounded-xl font-black uppercase text-sm transition-colors ${
                          isApproved 
                          ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                          : isPending
                          ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                          : 'bg-white text-black hover:bg-yellow-500 disabled:bg-gray-800'
                        }`}
                      >
                        {isClaiming === quest.id ? "..." : isApproved ? "CLAIMED ✓" : isPending ? "REVIEWING" : "Claim"}
                      </button>
                    </div>

                    {quest.type === 'social' && !isApproved && !isPending && (
                      <div className="mt-4">
                        <input
                          type="text"
                          placeholder="Paste X/Twitter link here"
                          value={proofs[quest.id] || ""}
                          onChange={(e) => setProofs(prev => ({ ...prev, [quest.id]: e.target.value }))}
                          className="w-full bg-black border border-gray-800 p-3 rounded-xl text-sm focus:border-yellow-500 outline-none text-white"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* GUESS GAME INTEGRATION */}
            <section className="mt-12">
               <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest ml-2 mb-4 text-center">Seeker Special Ops</h2>
               <GuessGameComponent />
            </section>

          </div>
        </main>
        <AppFooter />
      </div>
    </SeekerGuard>
  );
}