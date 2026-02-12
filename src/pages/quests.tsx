'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import SeekerGuard from '../components/SeekerGuard';

const isAlreadyClaimedToday = (lastCheckInDate: string | Date | null) => {
  if (!lastCheckInDate) return false;
  const lastDate = new Date(lastCheckInDate);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return lastDate >= todayMidnight;
};

export default function QuestsPage() {
  const { publicKey } = useWallet();
  const [dbQuests, setDbQuests] = useState([]);
  const [questStatuses, setQuestStatuses] = useState<Record<string, string>>({});
  const [userCheckins, setUserCheckins] = useState<{ laam: Date | null, tag: Date | null }>({ laam: null, tag: null });
  const [isClaiming, setIsClaiming] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [clickedQuests, setClickedQuests] = useState<Record<string, boolean>>({});
  const [proofLinks, setProofLinks] = useState<Record<string, string>>({});

  const fetchQuests = useCallback(async () => {
    try {
      const res = await fetch('/api/get-quests');
      const data = await res.json();
      setDbQuests(data.filter((v: any, i: number, a: any[]) => a.findIndex(t => t.id === v.id) === i));

      if (publicKey) {
        const historyRes = await fetch(`/api/user/history?address=${publicKey.toString()}`);
        const history = await historyRes.json();
        const statusMap = history.reduce((acc: any, item: any) => {
          acc[item.questId] = item.status;
          return acc;
        }, {});
        setQuestStatuses(statusMap);

        const userRes = await fetch(`/api/user/get-profile?address=${publicKey.toString()}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          setUserCheckins({
            laam: userData.lastLaamCheckIn,
            tag: userData.lastTagCheckIn
          });
        }
      }
    } catch (err) { console.error(err); }
  }, [publicKey]);

  useEffect(() => { fetchQuests(); }, [fetchQuests]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const resetTime = new Date();
      resetTime.setHours(23, 59, 59, 999);
      let diff = resetTime.getTime() - now.getTime();
      if (diff <= 0) {
        fetchQuests();
        toast.success("SYSTEM RESET!", { icon: '🚀' });
        resetTime.setDate(resetTime.getDate() + 1);
        diff = resetTime.getTime() - now.getTime();
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${h}h ${m}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchQuests]);

  // UPDATED: Added referralCodeUsed to daily check-ins
  const claimDaily = async (assetType: 'LAAM' | 'TAG') => {
    if (!publicKey) return toast.error("Connect wallet!");
    const referralCodeUsed = sessionStorage.getItem('pending_referral_code');
    setIsClaiming(assetType);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          asset: assetType,
          referralCodeUsed
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Claimed ${data.reward} ${assetType}!`);
        fetchQuests();
      } else {
        toast.error(data.message || "Failed to claim");
      }
    } finally { setIsClaiming(null); }
  };

  // UPDATED: Added referralCodeUsed to standard quest claims
  const claimQuest = async (questId: string, reward: number) => {
    if (!publicKey) return toast.error("Connect wallet!");
    const referralCodeUsed = sessionStorage.getItem('pending_referral_code');
    setIsClaiming(questId);
    try {
      const res = await fetch('/api/complete-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          questId,
          pointsReward: reward,
          referralCodeUsed
        }),
      });
      if (res.ok) {
        toast.success("Reward Claimed!");
        fetchQuests();
      }
      else {
        const errorData = await res.json();
        toast.error(errorData.message || "Failed to claim");
      }
    } catch (err) { toast.error("Network error"); }
    finally { setIsClaiming(null); }
  };

  // UPDATED: Added referralCodeUsed to social submissions
  const submitSocialQuest = async (questId: string) => {
    const link = proofLinks[questId];
    if (!link) return toast.error("Please provide proof!");
    if (!publicKey) return toast.error("Connect wallet!");
    const referralCodeUsed = sessionStorage.getItem('pending_referral_code');
    setIsClaiming(questId);
    try {
      const res = await fetch('/api/submit-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          questId,
          proofLink: link,
          referralCodeUsed
        }),
      });
      const data = await res.json();
      if (res.ok) { toast.success(data.message); fetchQuests(); }
      else { toast.error(data.message); }
    } catch (err) { toast.error("Submission failed"); }
    finally { setIsClaiming(null); }
  };

  const handleSocialClick = (questId: string, url: string) => {
    if (!url) return;
    window.open(url, '_blank');
    setClickedQuests(prev => ({ ...prev, [questId]: true }));
  };

  const isLaamClaimed = isAlreadyClaimedToday(userCheckins.laam);
  const isTagClaimed = isAlreadyClaimedToday(userCheckins.tag);

  const availableQuests = dbQuests.filter((q: any) =>
    q.type !== 'daily' && (!questStatuses[q.id] || questStatuses[q.id] === 'REJECTED')
  );
  const pendingQuests = dbQuests.filter((q: any) => questStatuses[q.id] === 'PENDING');
  const completedQuests = dbQuests.filter((q: any) => questStatuses[q.id] === 'COMPLETED' || questStatuses[q.id] === 'APPROVED');

  return (
    <SeekerGuard>
      <div className="main-content">
        <Toaster />
        <div className="content-wrapper">

          {/* SECTION: DAILY */}
          <h2 style={headerStyle}>
            <span>Daily Transmissions</span>
            <span style={{ color: '#ef4444' }}>Reset: {timeLeft}</span>
          </h2>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            <div className="terminal-card" style={{ flex: 1, opacity: isLaamClaimed ? 0.6 : 1 }}>
              <h3 style={{ fontSize: '14px', fontWeight: 900 }}>Daily LAAM</h3>
              <p style={{ color: '#eab308', fontSize: '10px' }}>STATUS: {isLaamClaimed ? "SECURED" : "AVAILABLE"}</p>
              <button
                onClick={() => claimDaily('LAAM')}
                disabled={isClaiming === 'LAAM' || isLaamClaimed}
                style={{ ...claimButtonStyle, width: '100%', marginTop: '10px', backgroundColor: isLaamClaimed ? '#22c55e' : '#fff', color: isLaamClaimed ? '#fff' : '#000' }}
              >
                {isLaamClaimed ? "CLAIMED ✓" : isClaiming === 'LAAM' ? "..." : "Claim LAAM"}
              </button>
            </div>

            <div className="terminal-card" style={{ flex: 1, opacity: isTagClaimed ? 0.6 : 1 }}>
              <h3 style={{ fontSize: '14px', fontWeight: 900 }}>Daily TAG</h3>
              <p style={{ color: '#22c55e', fontSize: '10px' }}>STATUS: {isTagClaimed ? "SECURED" : "AVAILABLE"}</p>
              <button
                onClick={() => claimDaily('TAG')}
                disabled={isClaiming === 'TAG' || isTagClaimed}
                style={{ ...claimButtonStyle, width: '100%', marginTop: '10px', backgroundColor: isTagClaimed ? '#22c55e' : '#fff', color: isTagClaimed ? '#fff' : '#000' }}
              >
                {isTagClaimed ? "CLAIMED ✓" : isClaiming === 'TAG' ? "..." : "Claim TAG"}
              </button>
            </div>
          </div>

          {/* SECTION: AVAILABLE */}
          <h2 style={headerStyle}><span>Available Intelligence</span> <span>[{availableQuests.length}]</span></h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '48px' }}>
            {availableQuests.map((quest: any) => {
              const hasClicked = clickedQuests[quest.id];
              const isSocialType = ['social', 'social_username', 'social_any_link'].includes(quest.type);
              return (
                <div key={quest.id} className="terminal-card">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 900 }}>{quest.title}</h3>
                        <span style={{ color: '#eab308', fontSize: '10px' }}>+{quest.reward} LAAM</span>
                      </div>
                      {quest.link && !hasClicked ? (
                        <button onClick={() => handleSocialClick(quest.id, quest.link)} style={claimButtonStyle}>MISSION LINK</button>
                      ) : isSocialType ? (
                        <button onClick={() => submitSocialQuest(quest.id)} disabled={isClaiming === quest.id} style={claimButtonStyle}>
                          {isClaiming === quest.id ? "..." : "SUBMIT PROOF"}
                        </button>
                      ) : (
                        <button onClick={() => claimQuest(quest.id, quest.reward)} disabled={isClaiming === quest.id} style={claimButtonStyle}>
                          {isClaiming === quest.id ? "..." : "CLAIM"}
                        </button>
                      )}
                    </div>
                    {isSocialType && hasClicked && (
                      <input
                        type="text"
                        placeholder="Paste proof here..."
                        value={proofLinks[quest.id] || ''}
                        onChange={(e) => setProofLinks(prev => ({ ...prev, [quest.id]: e.target.value }))}
                        style={{ background: '#111', border: '1px solid #333', color: '#fff', padding: '10px', fontSize: '10px', borderRadius: '8px', outline: 'none', marginTop: '10px' }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SECTION: PENDING */}
          {pendingQuests.length > 0 && (
            <>
              <h2 style={{ ...headerStyle, color: '#60a5fa' }}><span>Under Review</span> <span>[{pendingQuests.length}]</span></h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '48px' }}>
                {pendingQuests.map((quest: any) => (
                  <div key={quest.id} className="terminal-card" style={{ border: '1px solid #60a5fa', opacity: 0.8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 900 }}>{quest.title}</h3>
                        <span style={{ color: '#60a5fa', fontSize: '10px' }}>PENDING VERIFICATION...</span>
                      </div>
                      <div style={{ color: '#60a5fa', fontSize: '10px', fontWeight: 900 }}>WAITING</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* SECTION: ARCHIVED */}
          {completedQuests.length > 0 && (
            <>
              <h2 style={{ ...headerStyle, color: 'rgba(255,255,255,0.2)' }}>
                <span>Archived Data</span>
                <span>[{completedQuests.length}]</span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: 0.5 }}>
                {completedQuests.map((quest: any) => (
                  <div key={quest.id} className="terminal-card" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 900, textDecoration: 'line-through' }}>{quest.title}</h3>
                        <span style={{ color: '#22c55e', fontSize: '9px' }}>DATA SECURED</span>
                      </div>
                      <div style={{ padding: '10px 20px', fontSize: '10px', fontWeight: 900, color: '#22c55e' }}>CLAIMED ✓</div>
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

const headerStyle: any = { fontSize: '10px', fontWeight: 900, color: '#eab308', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' };
const claimButtonStyle: any = { padding: '10px 20px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', backgroundColor: '#fff', color: '#000', border: 'none', fontSize: '10px', textTransform: 'uppercase' };