'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import SeekerGuard from '../components/SeekerGuard';
import { ChevronDown, ChevronUp, Clock, XCircle, Lock, Zap, CheckCircle2 } from 'lucide-react';
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
  const [userCheckins, setUserCheckins] = useState<{ laam: Date | null; tag: Date | null }>({ laam: null, tag: null });
  const [isClaiming, setIsClaiming] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [clickedQuests, setClickedQuests] = useState<Record<string, boolean>>({});
  const [proofLinks, setProofLinks] = useState<Record<string, string>>({});
  const [showAllArchived, setShowAllArchived] = useState(false);
  const [streakCount, setStreakCount] = useState<number>(0);

  const fetchQuests = useCallback(async () => {
    try {
      const res = await fetch('/api/get-quests');
      const data = await res.json();
      setDbQuests(data.filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.id === v.id) === i));

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
          setStreakCount(userData.streakCount || 0);
          setUserCheckins({ laam: userData.lastLaamCheckIn, tag: userData.lastTagCheckIn });
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
        toast.success('SYSTEM RESET!', { icon: '🚀' });
        resetTime.setDate(resetTime.getDate() + 1);
        diff = resetTime.getTime() - now.getTime();
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / (1000 * 60)) % 60);
      setTimeLeft(`${h}h ${m}m`);
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
      } else if (status === 'PENDING') {
        acc.pending.push(q);
      } else {
        acc.available.push({ ...q, hoursRemaining: Math.max(0, Math.ceil((THREE_DAYS_MS - (now - createdTime)) / (1000 * 60 * 60))) });
      }
      return acc;
    }, { available: [], pending: [], archived: [] });
  }, [dbQuests, questStatuses]);

  const claimDaily = async (assetType: 'LAAM' | 'TAG') => {
    if (!publicKey) return toast.error('Connect wallet!');
    const referralCodeUsed = sessionStorage.getItem('pending_referral_code');
    setIsClaiming(assetType);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toString(), asset: assetType, referralCodeUsed }),
      });
      const data = await res.json();
      if (res.ok) { toast.success(`Claimed ${data.reward} ${assetType}!`); fetchQuests(); }
      else toast.error(data.message || 'Failed to claim');
    } finally { setIsClaiming(null); }
  };

  const claimQuest = async (questId: string, reward: number) => {
    if (!publicKey) return toast.error('Connect wallet!');
    const referralCodeUsed = sessionStorage.getItem('pending_referral_code');
    setIsClaiming(questId);
    try {
      const res = await fetch('/api/complete-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toString(), questId, pointsReward: reward, referralCodeUsed }),
      });
      if (res.ok) { toast.success('Reward Claimed!'); fetchQuests(); }
      else { const e = await res.json(); toast.error(e.message || 'Failed to claim'); }
    } catch { toast.error('Network error'); }
    finally { setIsClaiming(null); }
  };

  const submitSocialQuest = async (questId: string) => {
    const link = proofLinks[questId];
    if (!link) return toast.error('Please provide proof!');
    if (!publicKey) return toast.error('Connect wallet!');
    const referralCodeUsed = sessionStorage.getItem('pending_referral_code');
    setIsClaiming(questId);
    try {
      const res = await fetch('/api/submit-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toString(), questId, proofLink: link, referralCodeUsed }),
      });
      const data = await res.json();
      if (res.ok) { toast.success(data.message); fetchQuests(); }
      else toast.error(data.message);
    } catch { toast.error('Submission failed'); }
    finally { setIsClaiming(null); }
  };

  const handleSocialClick = (questId: string, url: string) => {
    if (!url) return;
    window.open(url, '_blank');
    setClickedQuests(prev => ({ ...prev, [questId]: true }));
  };

  const isLaamClaimed = isAlreadyClaimedToday(userCheckins.laam);
  const isTagClaimed = isAlreadyClaimedToday(userCheckins.tag);
  const isMilestone = streakCount > 0 && streakCount % 10 === 0;

  return (
    <SeekerGuard>
      <div className="main-content">
        <Toaster />
        <div className="content-wrapper">

          {/* ── STREAK ODOMETER ── */}
          <div className={styles.odometerContainer}>
            <div className={styles.odometerLeft}>
              <span className={styles.odometerLabel}>ACTIVE LOG STREAK</span>
              <div className={styles.digitRow}>
                <div className={styles.digits}>
                  {String(streakCount).padStart(3, '0').split('').map((digit, i) => (
                    <div key={i} className={`${styles.digitBox} ${isMilestone ? styles.milestoneGlow : ''}`}>
                      <div className={styles.digitGlow} />
                      {digit}
                    </div>
                  ))}
                </div>
                <span className={styles.daysLabel}>DAYS</span>
              </div>
            </div>
            <div className={styles.odometerRight}>
              <span className={styles.systemStatusLabel}>SYSTEM STATUS</span>
              <span className={`${styles.systemStatusValue} ${streakCount > 0 ? styles.statusActive : styles.statusInactive}`}>
                {streakCount > 0 ? '● STREAK ACTIVE' : '○ NO DATA'}
              </span>
            </div>
          </div>

          {/* ── DAILY TRANSMISSIONS ── */}
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Daily Transmissions</h2>
            <span className={styles.resetTimer}>
              <Clock size={10} />
              Reset: {timeLeft}
            </span>
          </div>

          <div className={styles.dailyGrid}>
            {(['LAAM', 'TAG'] as const).map((asset) => {
              const isClaimed = asset === 'LAAM' ? isLaamClaimed : isTagClaimed;
              const isLoading = isClaiming === asset;
              return (
                <div key={asset} className={`${styles.dailyCard} ${isClaimed ? styles.dailyCardClaimed : ''}`}>
                  <div className={styles.dailyCardTop}>
                    <span className={styles.dailyAssetName}>Daily {asset}</span>
                    <span className={`${styles.dailyStatus} ${isClaimed ? styles.dailyStatusClaimed : styles.dailyStatusAvail}`}>
                      {isClaimed ? 'SECURED' : 'AVAILABLE'}
                    </span>
                  </div>
                  <button
                    onClick={() => claimDaily(asset)}
                    disabled={isLoading || isClaimed}
                    className={`${styles.claimBtn} ${isClaimed ? styles.claimBtnDone : styles.claimBtnReady}`}
                  >
                    {isClaimed ? <><CheckCircle2 size={12} /> CLAIMED</> : isLoading ? '...' : <><Zap size={12} fill="#000" /> CLAIM {asset}</>}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── AVAILABLE QUESTS ── */}
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Available Intelligence</h2>
            <span className={styles.sectionCount}>[{available.length}]</span>
          </div>

          <div className={styles.questList}>
            {available.map((quest: any) => {
              const hasClicked = clickedQuests[quest.id];
              const isSocialType = ['social', 'social_username', 'social_any_link'].includes(quest.type);
              const isLoading = isClaiming === quest.id;
              return (
                <div key={quest.id} className={styles.questCard}>
                  <div className={styles.questCardInner}>
                    <div className={styles.questInfo}>
                      <h3 className={styles.questTitle}>{quest.title}</h3>
                      <div className={styles.questMeta}>
                        <span className={styles.questReward}>+{quest.reward} LAAM</span>
                        <span className={styles.questTimer}>
                          <Clock size={9} />
                          {quest.hoursRemaining}H LEFT
                        </span>
                      </div>
                    </div>
                    <div className={styles.questAction}>
                      {quest.link && !hasClicked ? (
                        <button onClick={() => handleSocialClick(quest.id, quest.link)} className={styles.actionBtn}>
                          MISSION LINK
                        </button>
                      ) : isSocialType ? (
                        <button onClick={() => submitSocialQuest(quest.id)} disabled={isLoading} className={styles.actionBtn}>
                          {isLoading ? '...' : 'SUBMIT PROOF'}
                        </button>
                      ) : (
                        <button onClick={() => claimQuest(quest.id, quest.reward)} disabled={isLoading} className={`${styles.actionBtn} ${styles.actionBtnGold}`}>
                          {isLoading ? '...' : 'CLAIM'}
                        </button>
                      )}
                    </div>
                  </div>
                  {isSocialType && hasClicked && (
                    <input
                      type="text"
                      placeholder="Paste proof link here..."
                      value={proofLinks[quest.id] || ''}
                      onChange={(e) => setProofLinks(prev => ({ ...prev, [quest.id]: e.target.value }))}
                      className={styles.proofInput}
                    />
                  )}
                </div>
              );
            })}
            {available.length === 0 && (
              <div className={styles.emptyState}>
                <span>No active intelligence available</span>
              </div>
            )}
          </div>

          {/* ── PENDING ── */}
          {pending.length > 0 && (
            <>
              <div className={styles.sectionHeader}>
                <h2 className={`${styles.sectionTitle} ${styles.sectionTitleBlue}`}>Under Review</h2>
                <span className={`${styles.sectionCount} ${styles.sectionCountBlue}`}>[{pending.length}]</span>
              </div>
              <div className={styles.questList}>
                {pending.map((quest: any) => (
                  <div key={quest.id} className={`${styles.questCard} ${styles.questCardPending}`}>
                    <div className={styles.questCardInner}>
                      <div className={styles.questInfo}>
                        <h3 className={styles.questTitle}>{quest.title}</h3>
                        <span className={styles.pendingLabel}>PENDING VERIFICATION...</span>
                      </div>
                      <span className={styles.waitingTag}>WAITING</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── ARCHIVED ── */}
          {archived.length > 0 && (() => {
            const secured = archived.filter((q: any) => ['COMPLETED', 'APPROVED'].includes(q.displayStatus));
            const missed = archived.filter((q: any) => ['REJECTED', 'EXPIRED'].includes(q.displayStatus));
            const visibleSecured = showAllArchived ? secured : secured.slice(0, 2);
            const visibleMissed = showAllArchived ? missed : missed.slice(0, 1);
            const totalHidden = (secured.length - visibleSecured.length) + (missed.length - visibleMissed.length);

            const renderCard = (quest: any) => {
              const isRejected = quest.displayStatus === 'REJECTED';
              const isExpired = quest.displayStatus === 'EXPIRED';
              const isSuccess = ['COMPLETED', 'APPROVED'].includes(quest.displayStatus);
              const isLocked = isRejected || isExpired;
              return (
                <div key={quest.id} className={`${styles.questCard} ${isSuccess ? styles.questCardSecured : styles.questCardMissed} ${isLocked ? styles.questCardLocked : ''}`}>
                  {isLocked && (
                    <div className={styles.lockedOverlay}>
                      <Lock size={11} /><span>MISSION LOCKED</span>
                    </div>
                  )}
                  <div className={`${styles.questCardInner} ${isLocked ? styles.blurred : ''}`}>
                    <div className={styles.questInfo}>
                      <h3 className={`${styles.questTitle} ${isSuccess ? styles.questTitleStrike : ''} ${isExpired ? styles.questTitleDim : ''}`}>
                        {quest.title}
                      </h3>
                      <span className={`${styles.archiveStatus} ${isRejected ? styles.archiveRejected : isExpired ? styles.archiveExpired : styles.archiveSuccess}`}>
                        {isExpired ? 'EXPIRED' : quest.displayStatus}
                      </span>
                    </div>
                    <div className={styles.archiveIcon}>
                      {isRejected && <XCircle size={13} color="#ef4444" />}
                      {isExpired && <Clock size={13} color="#6b7280" />}
                      {isSuccess && <CheckCircle2 size={13} color="#22c55e" />}
                    </div>
                  </div>
                </div>
              );
            };

            return (
              <>
                <div className={styles.sectionHeader}>
                  <h2 className={`${styles.sectionTitle} ${styles.sectionTitleDim}`}>Archived Logs</h2>
                  <span className={`${styles.sectionCount} ${styles.sectionCountDim}`}>[{archived.length}]</span>
                </div>

                <div className={styles.questList}>
                  {secured.length > 0 && (
                    <>
                      <div className={styles.archivedSubHeader}>
                        <span className={`${styles.archivedSubLabel} ${styles.archivedSubLabelGreen}`}>Secured</span>
                        <span className={`${styles.archivedSubCount} ${styles.archivedSubCountGreen}`}>{secured.length}</span>
                        <span className={`${styles.archivedSubLine} ${styles.archivedSubLineGreen}`} />
                      </div>
                      {visibleSecured.map(renderCard)}
                    </>
                  )}

                  {missed.length > 0 && (
                    <>
                      <div className={styles.archivedSubHeader}>
                        <span className={`${styles.archivedSubLabel} ${styles.archivedSubLabelRed}`}>Missed</span>
                        <span className={`${styles.archivedSubCount} ${styles.archivedSubCountRed}`}>{missed.length}</span>
                        <span className={`${styles.archivedSubLine} ${styles.archivedSubLineRed}`} />
                      </div>
                      {visibleMissed.map(renderCard)}
                    </>
                  )}

                  {totalHidden > 0 && (
                    <button onClick={() => setShowAllArchived(!showAllArchived)} className={styles.showMoreBtn}>
                      {showAllArchived
                        ? <><ChevronUp size={11} /> SHOW LESS</>
                        : <><ChevronDown size={11} /> VIEW ALL LOGS — {totalHidden} MORE</>}
                    </button>
                  )}
                </div>
              </>
            );
          })()}

        </div>
      </div>
    </SeekerGuard>
  );
}