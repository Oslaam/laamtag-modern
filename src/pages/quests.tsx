import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import SeekerGuard from '../components/SeekerGuard';

export default function QuestsPage() {
  const { publicKey } = useWallet();
  const [dbQuests, setDbQuests] = useState([]);
  const [questStatuses, setQuestStatuses] = useState<Record<string, string>>({});
  const [isClaiming, setIsClaiming] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("");

  // 1. Fetch Quests and User History
  const fetchQuests = async () => {
    try {
      const res = await fetch('/api/get-quests');
      const data = await res.json();

      // Strict unique filtering by ID
      const unique = data.filter((v: any, i: number, a: any[]) => a.findIndex(t => t.id === v.id) === i);
      setDbQuests(unique);

      if (publicKey) {
        const history = await fetch(`/api/user/history?address=${publicKey.toString()}`).then(r => r.json());
        const statusMap = history.reduce((acc: any, item: any) => {
          acc[item.questId] = item.status;
          return acc;
        }, {});
        setQuestStatuses(statusMap);
      }
    } catch (err) {
      console.error("Quest Fetch Error:", err);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, [publicKey]);

  // 2. Countdown for Daily Logic
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const resetTime = new Date().setHours(23, 59, 59, 999);
      const diff = resetTime - now.getTime();
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Claim Quest Logic
  const claimQuest = async (questId: string, reward: number, type: string) => {
    if (!publicKey) return toast.error("Connect wallet!");
    setIsClaiming(questId);

    // Immediate UI feedback
    setQuestStatuses(prev => ({ ...prev, [questId]: 'COMPLETED' }));

    try {
      const res = await fetch(type === 'daily' ? '/api/checkin' : '/api/complete-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          questId,
          pointsReward: reward
        }),
      });

      if (res.ok) {
        toast.success("Reward Claimed!");
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Failed to claim");
        fetchQuests(); // Rollback UI state if server fails
      }
    } catch (err) {
      toast.error("Network error");
      fetchQuests(); // Rollback UI state
    } finally {
      setIsClaiming(null);
    }
  };

  return (
    <SeekerGuard>
      <div className="py-6 px-4 max-w-xl mx-auto pb-32">
        <Toaster />
        <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6">
          Available Intelligence Quests
        </h2>

        <div className="space-y-3">
          {dbQuests.map((quest: any) => {
            const status = questStatuses[quest.id];
            const isApproved = status === 'APPROVED' || status === 'COMPLETED';

            return (
              <div
                key={quest.id}
                className="bg-white/5 border border-white/10 p-5 rounded-[24px] flex justify-between items-center group hover:bg-white/[0.07] transition-all"
              >
                <div>
                  <h3 className="font-bold text-sm tracking-tight">{quest.title}</h3>
                  <div className="flex gap-3 items-center mt-1">
                    <p className="text-yellow-500 font-mono text-[10px] font-bold">
                      +{quest.reward} LAAM
                    </p>
                    {quest.type === 'daily' && (
                      <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter bg-red-500/10 px-2 py-0.5 rounded-md">
                        Reset: {timeLeft}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => claimQuest(quest.id, quest.reward, quest.type)}
                  disabled={isApproved || isClaiming === quest.id}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${isApproved
                      ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                      : 'bg-white text-black hover:bg-yellow-500 active:scale-95'
                    }`}
                >
                  {isClaiming === quest.id ? "..." : isApproved ? "CLAIMED ✓" : "Claim"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </SeekerGuard>
  );
}