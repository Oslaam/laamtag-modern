import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useWallet } from '@solana/wallet-adapter-react';
import { Trophy, Medal, Crown } from 'lucide-react';
import SeekerGuard from '../components/SeekerGuard';
import { getRank } from '../utils/ranks';

interface LeaderboardUser {
  walletAddress: string;
  laamPoints: number;
  tier: string;
  completedQuestsCount: number;
}

interface UserStanding extends LeaderboardUser {
  rank: number;
}

export default function LeaderboardPage() {
  const { publicKey } = useWallet();
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
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
        setLeaders(data.topUsers);
        setMyStats(data.userRank);
      } catch (err) {
        console.error("Leaderboard fetch error", err);
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

        <div className="content-wrapper">
          {/* HEADER */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 className="page-title" style={{ color: '#eab308' }}>
              Hall of Seekers
            </h1>
            <p className="terminal-desc" style={{ fontSize: '10px' }}>
              TOP CONTRIBUTORS IN THE UNIVERSE
            </p>
          </div>

          {/* LEADERBOARD TABLE CARD */}
          <div className="terminal-card" style={{ padding: '0', overflow: 'hidden' }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 80px 100px',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <span style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.3)' }}>RANK</span>
              <span style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.3)' }}>SEEKER</span>
              <span style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>TIER</span>
              <span style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>POINTS</span>
            </div>

            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <p className="terminal-desc" style={{ animation: 'pulse 1.5s infinite' }}>SYNCING LEDGER...</p>
              </div>
            ) : (
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {leaders.map((leader, index) => {
                  const isUser = leader.walletAddress === publicKey?.toString();
                  const rank = index + 1;

                  return (
                    <div
                      key={leader.walletAddress}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '60px 1fr 80px 100px',
                        padding: '16px 20px',
                        alignItems: 'center',
                        background: isUser ? 'rgba(234, 179, 8, 0.05)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {rank === 1 ? <Crown size={14} color="#eab308" /> :
                          rank <= 3 ? <Medal size={14} color={rank === 2 ? '#94a3b8' : '#cd7f32'} /> : null}
                        <span style={{
                          fontWeight: 900,
                          color: rank <= 3 ? '#eab308' : 'rgba(255,255,255,0.4)',
                          fontSize: rank <= 3 ? '16px' : '12px'
                        }}>#{rank}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          color: isUser ? '#eab308' : '#fff'
                        }}>
                          {leader.walletAddress.slice(0, 4)}...{leader.walletAddress.slice(-4)}
                        </span>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <span style={{
                          fontSize: '8px',
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'rgba(255,255,255,0.5)'
                        }}>
                          {leader.tier}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right', fontWeight: 900, color: '#eab308', fontSize: '14px' }}>
                        {leader.laamPoints.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SPACER FOR STICKY FOOTER */}
          <div style={{ height: '140px' }}></div>
        </div>

        {/* PERSISTENT USER STANDING */}
        {publicKey && myStats && (
          <div style={{
            position: 'fixed',
            bottom: '100px', // Sits above the main footer
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '400px',
            background: '#eab308',
            borderRadius: '24px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            zIndex: 50
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#000', color: '#fff', padding: '8px 12px', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: '8px', margin: 0, opacity: 0.6 }}>RANK</p>
                <p style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>#{myStats.rank}</p>
              </div>
              <div>
                <p style={{ fontSize: '8px', fontWeight: 900, color: 'rgba(0,0,0,0.5)', margin: 0 }}>YOUR STANDING</p>
                <p style={{ fontSize: '14px', fontWeight: 900, color: '#000', margin: 0 }}>{getRank(myStats.laamPoints).name} SEEKER</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '18px', fontWeight: 900, color: '#000', margin: 0 }}>
                {myStats.laamPoints?.toLocaleString()} <span style={{ fontSize: '10px' }}>LAAM</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </SeekerGuard>
  );
}