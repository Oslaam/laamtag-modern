'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import SeekerGuard from '../components/SeekerGuard';
import { ChevronDown, ChevronUp, Clock, XCircle, CheckCircle2, Lock } from 'lucide-react';
import styles from '../styles/Quests.module.css';

const isAlreadyClaimedToday = (lastCheckInDate: string | Date | null) => {
  if (!lastCheckInDate) return false;
  const lastDate = new Date(lastCheckInDate);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return lastDate >= todayMidnight;
};

export default function QuestsPage() {
  const { publicKey } = useWallet();
  const [dbQuests, setDbQuests] = useState<any[]>([]);
  const [questStatuses, setQuestStatuses] = useState<Record<string, string>>({});
  const [userCheckins, setUserCheckins] = useState<{ laam: Date | null, tag: Date | null }>({ laam: null, tag: null });
  const [isClaiming, setIsClaiming] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [clickedQuests, setClickedQuests] = useState<Record<string, boolean>>({});
  const [proofLinks, setProofLinks] = useState<Record<string, string>>({});
  const [showAllArchived, setShowAllArchived] = useState(false);
  const [streakCount, setStreakCount] = useState<number>(0);

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
          setStreakCount(userData.streakCount || 0); // Directly set streak from Prisma
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

  const { available, pending, archived } = useMemo(() => {
    const now = new Date().getTime();
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    return dbQuests.reduce((acc: any, q: any) => {
      const status = questStatuses[q.id];
      const createdTime = new Date(q.createdAt || Date.now()).getTime();
      const isExpired = (now - createdTime) > THREE_DAYS_MS;

      if (q.type === 'daily') return acc;

      if (status === 'REJECTED' || status === 'COMPLETED' || status === 'APPROVED' || (isExpired && !status)) {
        acc.archived.push({ ...q, displayStatus: status || 'EXPIRED' });
      }
      else if (status === 'PENDING') {
        acc.pending.push(q);
      }
      else {
        acc.available.push({
          ...q,
          hoursRemaining: Math.max(0, Math.ceil((THREE_DAYS_MS - (now - createdTime)) / (1000 * 60 * 60)))
        });
      }
      return acc;
    }, { available: [], pending: [], archived: [] });
  }, [dbQuests, questStatuses]);

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
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Failed to claim");
      }
    } catch (err) { toast.error("Network error"); }
    finally { setIsClaiming(null); }
  };

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

  // Logic for milestone effects
  const isMilestone = streakCount > 0 && streakCount % 10 === 0;

  return (
    <SeekerGuard>
      <div className="main-content">
        <Toaster />
        <div className="content-wrapper">

          {/* --- STREAK ODOMETER SECTION --- */}
          <div className={styles.odometerContainer}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '9px', color: '#666', fontWeight: 900, letterSpacing: '2px' }}>ACTIVE LOG STREAK</span>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {String(streakCount).padStart(3, '0').split('').map((digit, i) => (
                    <div
                      key={i}
                      className={`${styles.digitBox} ${isMilestone ? styles.milestoneGlow : ''}`}
                    >
                      <div className={styles.digitGlow}></div>
                      {digit}
                    </div>
                  ))}
                </div>
                <span style={{ fontSize: '12px', fontWeight: 900, color: '#eab308', paddingBottom: '4px' }}>DAYS</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '8px', color: '#444' }}>SYSTEM STATUS</div>
              <div style={{ fontSize: '12px', color: streakCount > 0 ? '#22c55e' : '#ef4444', fontWeight: 900 }}>
                {streakCount > 0 ? '● STREAK ACTIVE' : '○ NO DATA'}
              </div>
            </div>
          </div>

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
          <h2 style={headerStyle}><span>Available Intelligence</span> <span>[{available.length}]</span></h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '48px' }}>
            {available.map((quest: any) => {
              const hasClicked = clickedQuests[quest.id];
              const isSocialType = ['social', 'social_username', 'social_any_link'].includes(quest.type);
              return (
                <div key={quest.id} className="terminal-card">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 900 }}>{quest.title}</h3>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ color: '#eab308', fontSize: '10px' }}>+{quest.reward} LAAM</span>
                          <span style={{ color: '#ef4444', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={10} /> {quest.hoursRemaining}H LEFT
                          </span>
                        </div>
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
          {pending.length > 0 && (
            <>
              <h2 style={{ ...headerStyle, color: '#60a5fa' }}><span>Under Review</span> <span>[{pending.length}]</span></h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '48px' }}>
                {pending.map((quest: any) => (
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
          {archived.length > 0 && (
            <>
              <h2 style={{ ...headerStyle, color: 'rgba(255,255,255,0.2)' }}>
                <span>Archived Data (Logs)</span>
                <span>[{archived.length}]</span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(showAllArchived ? archived : archived.slice(0, 3)).map((quest: any) => {
                  const isRejected = quest.displayStatus === 'REJECTED';
                  const isExpired = quest.displayStatus === 'EXPIRED';
                  const isSuccess = ['COMPLETED', 'APPROVED'].includes(quest.displayStatus);
                  const isLocked = isRejected || isExpired;

                  return (
                    <div
                      key={quest.id}
                      className="terminal-card"
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        opacity: isLocked ? 0.5 : 0.8,
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: isLocked ? 'not-allowed' : 'default'
                      }}
                    >
                      {/* LOCKED OVERLAY */}
                      {isLocked && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'rgba(0,0,0,0.4)', backdropFilter: 'grayscale(1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '10px', fontWeight: 900 }}>
                            <Lock size={12} /> MISSION LOCKED
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', filter: isLocked ? 'blur(1px)' : 'none' }}>
                        <div>
                          <h3 style={{
                            fontSize: '14px',
                            fontWeight: 900,
                            textDecoration: isSuccess ? 'line-through' : 'none',
                            color: isExpired ? '#6b7280' : 'inherit'
                          }}>
                            {quest.title}
                          </h3>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            color: isRejected ? '#ef4444' : isExpired ? '#6b7280' : '#22c55e'
                          }}>
                            {isExpired ? "EXPIRED" : quest.displayStatus}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isRejected && <XCircle size={14} color="#ef4444" />}
                          {isExpired && <Clock size={14} color="#6b7280" />}
                          {isSuccess && <div style={{ color: '#22c55e', fontSize: '10px', fontWeight: 900 }}>SECURED ✓</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {archived.length > 3 && (
                  <button
                    onClick={() => setShowAllArchived(!showAllArchived)}
                    style={{
                      background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
                      padding: '10px', borderRadius: '8px', fontSize: '9px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '10px'
                    }}
                  >
                    {showAllArchived ? <><ChevronUp size={12} /> SHOW LESS</> : <><ChevronDown size={12} /> VIEW ALL LOGS</>}
                  </button>
                )}
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