import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useWallet } from '@solana/wallet-adapter-react';
import { Trophy, Medal, Crown, UserPlus, Users, Fingerprint } from 'lucide-react';
import SeekerGuard from '../components/SeekerGuard';
import { getRank } from '../utils/ranks';
import styles from '../styles/Leaderboard.module.css';

interface LeaderboardUser {
  walletAddress: string;
  laamPoints: number;
  tier: string;
  completedQuestsCount: number;
  username?: string;
  referralCount?: number;
}

interface UserStanding extends LeaderboardUser {
  rank: number;
}

export default function LeaderboardPage() {
  const { publicKey } = useWallet();
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [eliteRecruiters, setEliteRecruiters] = useState<LeaderboardUser[]>([]);
  const [myStats, setMyStats] = useState<UserStanding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const url = publicKey
          ? `/api/leaderboard?address=${publicKey.toString()}`
          : '/api/leaderboard';
        const res = await fetch(url);
        const data = await res.json();

        setLeaders((data.topUsers || []).slice(0, 10));
        setMyStats(data.userRank || null);

        const recruiterData = [...(data.topUsers || [])]
          .filter(user => (user.referralCount || 0) > 0)
          .sort((a, b) => (b.referralCount || 0) - (a.referralCount || 0))
          .slice(0, 5);

        setEliteRecruiters(recruiterData);
      } catch (err) {
        console.error('Leaderboard fetch error', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [publicKey]);

  return (
    <SeekerGuard>
      <div className="main-content">
        <Head><title>LAAMTAG | Leaderboard</title></Head>

        <div className={`content-wrapper ${styles.wrapper}`}>

          {/* ── HEADER ── */}
          <div className={styles.header}>
            <h1 className={`page-title ${styles.pageTitle}`}>Hall of Seekers</h1>
            <p className={`terminal-desc ${styles.subtitle}`}>TOP CONTRIBUTORS IN THE UNIVERSE</p>
          </div>

          {/* ── MAIN LEADERBOARD TABLE ── */}
          <div className={styles.card}>

            {/* Column headers */}
            <div className={styles.tableHead}>
              <span className={styles.headCell}>RANK</span>
              <span className={styles.headCell}>SEEKER</span>
              <span className={`${styles.headCell} ${styles.headCenter} ${styles.headTier}`}>TIER</span>
              <span className={`${styles.headCell} ${styles.headRight}`}>POINTS</span>
            </div>

            {loading ? (
              <div className={styles.loading}>
                <p className="terminal-desc">SYNCING LEDGER...</p>
              </div>
            ) : (
              <div className={styles.tableBody}>
                {leaders.map((leader, index) => {
                  const isUser = leader.walletAddress === publicKey?.toString();
                  const rank = index + 1;

                  const displayName =
                    leader.username ||
                    `${leader.walletAddress.slice(0, 4)}...${leader.walletAddress.slice(-4)}`;

                  // Logic updated to highlight Gold/Elite tiers even without .laam username
                  const nameColor = (leader.username?.includes('.laam') || leader.tier !== "Bronze")
                    ? '#eab308'
                    : leader.username?.includes('.skr')
                      ? '#22d3ee'
                      : isUser
                        ? '#eab308'
                        : '#fff';

                  return (
                    <div
                      key={leader.walletAddress}
                      className={isUser ? styles.rowHighlight : styles.row}
                    >
                      {/* Rank */}
                      <div className={styles.rankCell}>
                        {rank === 1 ? (
                          <Crown size={14} color="#eab308" />
                        ) : rank <= 3 ? (
                          <Medal size={14} color={rank === 2 ? '#94a3b8' : '#cd7f32'} />
                        ) : null}
                        <span className={rank <= 3 ? styles.rankNumTop : styles.rankNum}>
                          #{rank}
                        </span>
                      </div>

                      {/* Name */}
                      <span
                        className={leader.username ? styles.nameUsername : styles.nameWallet}
                        style={{ color: nameColor }}
                      >
                        {displayName}
                      </span>

                      {/* Tier */}
                      <div className={`${styles.tierCell} ${styles.headTier}`}>
                        <span className={styles.tierBadge}>{leader.tier}</span>
                      </div>

                      {/* Points */}
                      <div className={styles.pointsCell}>
                        {Math.floor(leader.laamPoints).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── ELITE RECRUITERS ── */}
          {eliteRecruiters.length > 0 && (
            <>
              <div className={styles.recruiterHeader}>
                <div className={styles.recruiterBadge}>
                  <UserPlus size={14} color="#eab308" />
                  <span className={styles.recruiterBadgeText}>ELITE RECRUITERS</span>
                </div>
              </div>

              <div className={styles.cardRecruiter}>
                <div className={styles.tableHeadRecruiter}>
                  <span className={styles.headCellGold}>POS</span>
                  <span className={styles.headCellGold}>RECRUITER</span>
                  <span className={`${styles.headCellGold} ${styles.headRight}`}>
                    TOTAL RECRUITS
                  </span>
                </div>

                {eliteRecruiters.map((recruiter, index) => (
                  <div key={`rec-${recruiter.walletAddress}`} className={styles.recruiterRow}>
                    <span className={styles.rankPos}>{index + 1}</span>

                    <div className={styles.recruiterName}>
                      <Fingerprint size={12} color="#eab308" />
                      <span className={styles.recruiterNameText}>
                        {recruiter.username ||
                          `${recruiter.walletAddress.slice(0, 4)}...${recruiter.walletAddress.slice(-4)}`}
                      </span>
                    </div>

                    <div className={styles.recruitCount}>
                      <span className={styles.recruitCountNum}>{recruiter.referralCount}</span>
                      <Users size={12} color="rgba(255,255,255,0.3)" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className={styles.bottomSpacer} />
        </div>

        {/* ── PERSISTENT STANDING BAR ── */}
        {publicKey && myStats && (
          <div className={styles.standingBar}>
            <div className={styles.standingLeft}>
              <div className={styles.standingRankBox}>
                <p className={styles.standingRankLabel}>RANK</p>
              </div>
              <div className={styles.standingMeta}>
                <p className={styles.standingTag}>
                  {myStats.username || 'TAG STATUS'}
                </p>
                <p className={styles.standingRankName}>
                  {getRank(myStats.laamPoints).name}
                </p>
              </div>
            </div>

            <div className={styles.standingPoints}>
              <p className={styles.standingPointsNum}>
                {Math.floor(myStats.laamPoints || 0).toLocaleString()}{' '}
                <span className={styles.standingPointsUnit}>LAAM</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </SeekerGuard>
  );
}