'use client';

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

  // 2. Countdown Logic
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

  // 3. Claim Logic
  const claimQuest = async (questId: string, reward: number, type: string) => {
    if (!publicKey) return toast.error("Connect wallet!");
    setIsClaiming(questId);
    
    // Optimistic UI update
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
        fetchQuests();
      }
    } catch (err) {
      toast.error("Network error");
      fetchQuests();
    } finally {
      setIsClaiming(null);
    }
  };

  // --- 4. CATEGORIZATION LOGIC ---
  const availableQuests = dbQuests.filter((q: any) => {
    const status = questStatuses[q.id];
    return !(status === 'APPROVED' || status === 'COMPLETED');
  });

  const completedQuests = dbQuests.filter((q: any) => {
    const status = questStatuses[q.id];
    return status === 'APPROVED' || status === 'COMPLETED';
  });

  return (
    <SeekerGuard>
      <div className="main-content">
        <Toaster />

        <div className="content-wrapper">
          
          {/* SECTION 1: AVAILABLE */}
          <h2 style={{
            fontSize: '10px',
            fontWeight: 900,
            color: '#eab308',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>Available Intelligence</span>
            <span>[{availableQuests.length}]</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '48px' }}>
            {availableQuests.map((quest: any) => (
              <div key={quest.id} className="terminal-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 900, marginBottom: '4px' }}>{quest.title}</h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ color: '#eab308', fontSize: '10px', fontWeight: 900 }}>+{quest.reward} LAAM</span>
                      {quest.type === 'daily' && (
                        <span style={{ fontSize: '9px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>
                          RESET: {timeLeft}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => claimQuest(quest.id, quest.reward, quest.type)}
                    disabled={isClaiming === quest.id}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: '#fff',
                      color: '#000'
                    }}
                  >
                    {isClaiming === quest.id ? "..." : "Claim"}
                  </button>
                </div>
              </div>
            ))}
            {availableQuests.length === 0 && (
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '20px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                ALL MISSIONS COMPLETED. AWAITING FURTHER INSTRUCTIONS...
              </p>
            )}
          </div>

          {/* SECTION 2: COMPLETED */}
          {completedQuests.length > 0 && (
            <>
              <h2 style={{
                fontSize: '10px',
                fontWeight: 900,
                color: 'rgba(255,255,255,0.2)',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                marginBottom: '24px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Archived Data</span>
                <span>[{completedQuests.length}]</span>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: 0.5 }}>
                {completedQuests.map((quest: any) => (
                  <div key={quest.id} className="terminal-card" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 900, marginBottom: '4px', color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through' }}>
                          {quest.title}
                        </h3>
                        <span style={{ color: '#22c55e', fontSize: '9px', fontWeight: 900 }}>DATA SECURED</span>
                      </div>
                      <div style={{
                        padding: '10px 20px',
                        fontSize: '10px',
                        fontWeight: 900,
                        color: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        borderRadius: '12px'
                      }}>
                        CLAIMED ✓
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </SeekerGuard>
  );
}