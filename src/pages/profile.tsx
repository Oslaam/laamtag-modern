import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  ArrowLeft, History, Crown, Users, UserPlus,
  Fingerprint, Gift, Zap, Flame, ExternalLink, ShieldCheck
} from 'lucide-react';
import NftGallery from '../components/NftGallery';
import HistoryModal from '../components/HistoryModal';
import { resolveUserIdentity } from '../utils/identity';
import WarriorGallery from '../components/WarriorGallery';
import styles from '../styles/Profile.module.css';

export default function ProfilePage() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [displayName, setDisplayName] = useState('LOADING...');
  const [userData, setUserData] = useState<{
    walletAddress: string;
    laamPoints: number;
    rank: string;
    personalMinted: number;
    username?: string;
    referralCode?: string;
    referredBy?: string;
    referralProgress: number;
    claimableRewards: number;
    _count?: { referrals: number };
    claimedBadges?: any[];
  } | null>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);

  const fetchProfile = async () => {
    if (!publicKey) return;
    try {
      const res = await fetch(`/api/user/${publicKey.toString()}`);
      const statsData = await res.json();
      setUserData(statsData || null);
      const identity = await resolveUserIdentity(connection, publicKey.toString(), statsData?.username);
      setDisplayName(identity);
      if (!statsData?.username && (identity.includes('.laam') || identity.includes('.skr'))) {
        await axios.post('/api/user/sync-username', { walletAddress: publicKey.toString(), username: identity });
      }
    } catch {
      setDisplayName(publicKey ? `${publicKey.toString().slice(0, 4)}...` : 'UNKNOWN');
    }
  };

  const fetchFriends = async () => {
    if (!publicKey) return;
    try {
      const res = await axios.get(`/api/friends/list?walletAddress=${publicKey.toString()}`);
      if (res.data.success) setFriends(res.data.friends);
    } catch { }
  };

  useEffect(() => {
    fetchProfile();
    fetchFriends();
  }, [publicKey, connection]);

  const handleClaim = async () => {
    if (!userData || userData.claimableRewards <= 0) return;
    setClaiming(true);
    try {
      const res = await axios.post('/api/user/referral-claim-crate', { walletAddress: userData.walletAddress });
      if (res.data.success) { alert(res.data.message); fetchProfile(); }
    } catch { alert('Claim failed. Please try again later.'); }
    finally { setClaiming(false); }
  };

  const handleActivateCode = async () => {
    if (!publicKey || isActivating) return;
    setIsActivating(true);
    try {
      const res = await axios.get(`/api/user/referral?walletAddress=${publicKey.toString()}`);
      if (res.data.referralCode) await fetchProfile();
    } catch { alert('Activation failed.'); }
    finally { setIsActivating(false); }
  };

  const copyCode = () => {
    if (!userData?.referralCode) return;
    navigator.clipboard.writeText(userData.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nameColor =
    displayName.includes('.laam') ? styles.nameGold :
      displayName.includes('.skr') ? styles.nameCyan :
        styles.nameWhite;

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>

        <nav className={styles.nav}>
          <div className={styles.navLeft}>
            <Link href="/" className={styles.iconBtn}><ArrowLeft size={18} /></Link>
            <button className={styles.ledgerBtn} onClick={() => setIsHistoryOpen(true)}>
              <History size={15} /><span>Ledger</span>
            </button>
          </div>
          <div className={styles.navRight}>
            <div className={styles.identityMeta}>
              {userData?.username && <Crown size={11} className={styles.crownIcon} />}
              <span className={`${styles.displayName} ${nameColor}`}>{displayName}</span>
            </div>
            <span className={styles.walletShort}>
              {publicKey ? `${publicKey.toString().slice(0, 6)}...${publicKey.toString().slice(-4)}` : 'DISCONNECTED'}
            </span>
          </div>
        </nav>

        <div className={styles.heroCard}>
          <div className={styles.heroGlow} />
          <div className={styles.heroAvatar}>
            <ShieldCheck size={26} color="#000" strokeWidth={2.5} />
          </div>
          <h1 className={`${styles.heroName} ${nameColor}`}>{displayName}</h1>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            {userData?.rank || 'NEOPHYTE'} — CLEARANCE LEVEL
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal}>{userData?.laamPoints?.toLocaleString() || '0'}</span>
              <span className={styles.heroStatLabel}>LAAM PTS</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal}>{userData?.personalMinted || '0'}</span>
              <span className={styles.heroStatLabel}>MINTED</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal}>{userData?._count?.referrals || '0'}</span>
              <span className={styles.heroStatLabel}>RECRUITS</span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <p className={styles.cardLabel}>
            {userData?.username ? 'Verified Operator Callsign' : 'Callsign Not Registered'}
          </p>
          <div className={styles.callsignRow}>
            <div className={styles.callsignInput}>
              <input type="text" value={displayName} readOnly className={`${styles.input} ${nameColor}`} />
              {userData?.username && <span className={styles.verifiedTag}>VERIFIED</span>}
            </div>
            {!userData?.username ? (
              <Link href="/laam" className={styles.goldBtn}>
                <ExternalLink size={12} />GET .LAAM
              </Link>
            ) : (
              <button disabled className={styles.disabledBtn}>LOCKED</button>
            )}
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardGoldBorder}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <UserPlus size={13} className={styles.goldIcon} />
              <h3 className={styles.cardTitle}>Recruitment Hub</h3>
            </div>
            {userData && userData.claimableRewards > 0 && (
              <span className={styles.crateAlert}>{userData.claimableRewards} CRATE READY</span>
            )}
          </div>

          <div className={styles.codeRow}>
            <div className={styles.codeBlock}>
              <p className={styles.codeLabel}>My Personal Access Code</p>
              <p className={`${styles.codeValue} ${userData?.referralCode ? styles.codeActive : styles.codeInactive}`}>
                {userData?.referralCode || 'NOT ACTIVATED'}
              </p>
            </div>
            {!userData?.referralCode ? (
              <button onClick={handleActivateCode} disabled={isActivating} className={styles.activateBtn}>
                <Zap size={10} fill="#000" />
                {isActivating ? 'ACTIVATING...' : 'ACTIVATE'}
              </button>
            ) : (
              <button onClick={copyCode} className={styles.copyBtn}>
                {copied ? '✓ COPIED' : 'COPY'}
              </button>
            )}
          </div>

          <div className={styles.progressSection}>
            <div className={styles.progressMeta}>
              <span>CRATE PROGRESS</span>
              <span>{userData?.referralProgress || 0}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${userData?.referralProgress || 0}%` }} />
            </div>
          </div>

          <button
            onClick={handleClaim}
            disabled={!userData || userData.claimableRewards <= 0 || claiming}
            className={`${styles.claimBtn} ${(!userData || userData.claimableRewards <= 0) ? styles.claimBtnDisabled : ''}`}
          >
            <Gift size={14} />
            {claiming ? 'UNBOXING...' : `OPEN CRATE (${userData?.claimableRewards || 0})`}
          </button>

          <div className={styles.metaGrid}>
            <div className={styles.metaCell}>
              <p className={styles.metaCellLabel}>Invited By</p>
              <div className={styles.metaCellValue}>
                <Fingerprint size={10} className={styles.goldIcon} />
                <span>{userData?.referredBy ? `${userData.referredBy.slice(0, 8)}...` : 'LAAMTAG_ROOT'}</span>
              </div>
            </div>
            <div className={styles.metaCell}>
              <p className={styles.metaCellLabel}>Total Recruits</p>
              <div className={styles.metaCellValue}>
                <Users size={11} className={styles.goldIcon} />
                <span className={styles.metaBigNum}>{userData?._count?.referrals || 0}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsFriendsOpen(!isFriendsOpen)}
            className={`${styles.friendsToggle} ${isFriendsOpen ? styles.friendsToggleActive : ''}`}
          >
            <Users size={13} />
            {isFriendsOpen ? 'HIDE ALLIED OPERATORS' : `VIEW ALLIED OPERATORS (${friends.length})`}
          </button>

          {isFriendsOpen && (
            <div className={styles.friendsDrawer}>
              {friends.length === 0 ? (
                <p className={styles.friendsEmpty}>NO NEURAL LINKS ESTABLISHED</p>
              ) : (
                friends.map((friend) => {
                  const isMyTurn = friend.lastPokedBy !== publicKey?.toString();
                  const hasStreak = (friend.streak || 0) > 0;
                  return (
                    <div key={friend.walletAddress} className={styles.friendRow}>
                      <div className={styles.friendLeft}>
                        <div className={`${styles.streakChip} ${hasStreak ? styles.streakActive : ''}`}>
                          <Flame size={10} color={hasStreak ? '#ef4444' : '#555'} fill={hasStreak ? '#ef4444' : 'none'} />
                          <span>{friend.streak || 0}D</span>
                        </div>
                        <div>
                          <p className={styles.friendName}>{friend.username || 'ANON'}</p>
                          <p className={`${styles.friendStatus} ${isMyTurn ? styles.friendReady : ''}`}>
                            {isMyTurn ? 'READY TO NUDGE' : 'WAITING FOR RESPONSE'}
                          </p>
                        </div>
                      </div>
                      <button
                        disabled={!isMyTurn}
                        className={`${styles.pokeBtn} ${!isMyTurn ? styles.pokeBtnDisabled : ''}`}
                        onClick={async () => {
                          try {
                            await axios.post('/api/friends/poke', {
                              senderAddress: publicKey?.toString(),
                              receiverAddress: friend.walletAddress,
                              senderUsername: displayName,
                            });
                            fetchFriends();
                          } catch { alert('Neural link nudge failed.'); }
                        }}
                      >
                        <Zap size={13} fill={isMyTurn ? '#eab308' : 'none'} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <section className={styles.section}>
          <WarriorGallery />
        </section>

        <section className={`${styles.section} ${styles.sectionLast}`}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLine} />
            <h2 className={styles.sectionTitle}>My Genesis Collection</h2>
          </div>
          <div className={`${styles.card} ${styles.galleryCard}`}>
            <NftGallery />
          </div>
        </section>

      </div>
      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    </div>
  );
}