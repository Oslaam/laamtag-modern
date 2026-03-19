import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  ArrowLeft, Coins, Trophy, ShieldCheck, History, ExternalLink,
  Crown, Users, UserPlus, Fingerprint, Gift, Zap, Flame
} from 'lucide-react';
import NftGallery from '../components/NftGallery';
import HistoryModal from '../components/HistoryModal';
import { resolveUserIdentity } from '../utils/identity';
import WarriorGallery from '../components/WarriorGallery';

export default function ProfilePage() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [displayName, setDisplayName] = useState("LOADING...");
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
    claimedBadges?: any[]; // Added to match the safety check requirements
  } | null>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  // NEW: Friends State
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);

  // 1. RE-USABLE FETCH FUNCTION
  const fetchProfile = async () => {
    if (!publicKey) return;
    try {
      const res = await fetch(`/api/user/${publicKey.toString()}`);
      const statsData = await res.json();
      setUserData(statsData || null);

      const identity = await resolveUserIdentity(
        connection,
        publicKey.toString(),
        statsData?.username
      );

      setDisplayName(identity);

      if (!statsData?.username && (identity.includes('.laam') || identity.includes('.skr'))) {
        await axios.post('/api/user/sync-username', {
          walletAddress: publicKey.toString(),
          username: identity
        });
      }
    } catch (err) {
      console.error("Profile fetch error", err);
      setDisplayName(publicKey ? `${publicKey.toString().slice(0, 4)}...` : "UNKNOWN");
    }
  };

  // NEW: Fetch Friends Function
  const fetchFriends = async () => {
    if (!publicKey) return;
    try {
      const res = await axios.get(`/api/friends/list?walletAddress=${publicKey.toString()}`);
      if (res.data.success) setFriends(res.data.friends);
    } catch (err) {
      console.error("Friend fetch error", err);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchFriends(); // Fetch on load
  }, [publicKey, connection]);

  // Handle Crate Claim
  const handleClaim = async () => {
    if (!userData || userData.claimableRewards <= 0) return;
    setClaiming(true);
    try {
      const res = await axios.post('/api/user/referral-claim-crate', {
        walletAddress: userData.walletAddress
      });
      if (res.data.success) {
        alert(res.data.message);
        fetchProfile();
      }
    } catch (err) {
      alert("Claim failed. Please try again later.");
    } finally {
      setClaiming(false);
    }
  };

  const handleActivateCode = async () => {
    if (!publicKey || isActivating) return;
    setIsActivating(true);
    try {
      const res = await axios.get(`/api/user/referral?walletAddress=${publicKey.toString()}`);
      if (res.data.referralCode) {
        await fetchProfile();
      }
    } catch (err) {
      alert("Activation failed. Please check your connection.");
    } finally {
      setIsActivating(false);
    }
  };

  const copyCode = () => {
    if (!userData?.referralCode) return;
    navigator.clipboard.writeText(userData.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="main-content">
      <style jsx>{`
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 5px rgba(234, 179, 8, 0.5); transform: scale(1); }
          50% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.8); transform: scale(1.02); }
          100% { box-shadow: 0 0 5px rgba(234, 179, 8, 0.5); transform: scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .activate-btn {
          animation: pulse-glow 2s infinite ease-in-out;
          transition: all 0.3s ease;
        }
        .activate-btn:hover {
          filter: brightness(1.2);
          transform: translateY(-1px);
        }
        .friends-drawer {
          animation: slideDown 0.3s ease-out forwards;
          overflow: hidden;
        }
      `}</style>

      <div className="content-wrapper">

        {/* HEADER SECTION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/" style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '12px',
              borderRadius: '12px',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <ArrowLeft size={20} />
            </Link>

            <button
              onClick={() => setIsHistoryOpen(true)}
              style={{
                background: 'rgba(234, 179, 8, 0.1)',
                padding: '12px',
                borderRadius: '12px',
                color: '#eab308',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <History size={20} />
              <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>Ledger</span>
            </button>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
              {userData?.username && <Crown size={14} color="#eab308" style={{ filter: 'drop-shadow(0 0 5px #eab308)' }} />}
              <p className="terminal-desc" style={{
                color: displayName.includes('.laam') ? '#eab308' : (displayName.includes('.skr') ? '#22d3ee' : '#fff'),
                margin: 0,
                fontWeight: 900,
                textTransform: 'uppercase'
              }}>
                {displayName}
              </p>
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              {publicKey ? `${publicKey.toString().slice(0, 6)}...${publicKey.toString().slice(-4)}` : 'DISCONNECTED'}
            </p>
          </div>
        </div>

        {/* IDENTITY CARD */}
        <div className="terminal-card" style={{
          padding: '24px',
          marginBottom: '24px',
          textAlign: 'center',
          background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.05) 0%, transparent 100%)'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: '#eab308',
            borderRadius: '50%',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(234, 179, 8, 0.3)'
          }}>
            <ShieldCheck size={30} color="#000" />
          </div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 900,
            fontStyle: 'italic',
            textTransform: 'uppercase',
            margin: 0,
            color: displayName.includes('.laam') ? '#eab308' : '#fff'
          }}>
            {displayName}
          </h2>
          <p style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', marginTop: '4px' }}>
            {userData?.rank || 'NEOPHYTE'} — CLEARANCE LEVEL
          </p>
        </div>

        {/* RECRUITMENT HUB & CRATE SYSTEM */}
        <div className="terminal-card" style={{ padding: '20px', marginBottom: '24px', border: '1px solid rgba(234,179,8,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={16} color="#eab308" />
              <h3 style={{ fontSize: '12px', fontWeight: 900, margin: 0, color: '#fff', textTransform: 'uppercase' }}>Recruitment Hub</h3>
            </div>
            {userData && userData.claimableRewards > 0 && (
              <span className="pulse-text" style={{ fontSize: '10px', color: '#ef4444', fontWeight: 900 }}>
                {userData.claimableRewards} CRATE READY
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>My Personal Access Code</p>
                <p style={{ fontSize: '16px', color: userData?.referralCode ? '#eab308' : 'rgba(255,255,255,0.2)', fontWeight: 900, fontFamily: 'monospace', margin: 0 }}>
                  {userData?.referralCode || 'NOT ACTIVATED'}
                </p>
              </div>

              {!userData?.referralCode ? (
                <button
                  onClick={handleActivateCode}
                  disabled={isActivating}
                  className="activate-btn"
                  style={{
                    background: '#eab308',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 16px',
                    fontSize: '10px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Zap size={12} fill="#000" />
                  {isActivating ? 'ACTIVATING...' : 'ACTIVATE CODE'}
                </button>
              ) : (
                <button
                  onClick={copyCode}
                  style={{
                    background: 'rgba(234, 179, 8, 0.1)',
                    color: '#eab308',
                    border: '1px solid rgba(234, 179, 8, 0.5)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '10px',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  {copied ? 'COPIED' : 'COPY'}
                </button>
              )}
            </div>
          </div>

          {/* CRATE PROGRESS BAR */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
              <span>CRATE PROGRESS</span>
              <span>{userData?.referralProgress || 0}%</span>
            </div>
            <div style={{ height: '10px', background: 'rgba(0,0,0,0.5)', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{
                width: `${userData?.referralProgress || 0}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #eab308, #fbbf24)',
                boxShadow: '0 0 10px rgba(234, 179, 8, 0.4)',
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>
          </div>

          {/* CLAIM BUTTON */}
          <button
            onClick={handleClaim}
            disabled={!userData || userData.claimableRewards <= 0 || claiming}
            className="primary-btn"
            style={{
              width: '100%',
              marginBottom: '16px',
              cursor: (userData && userData.claimableRewards > 0) ? 'pointer' : 'not-allowed',
              opacity: (userData && userData.claimableRewards > 0) ? 1 : 0.3,
              filter: (userData && userData.claimableRewards > 0) ? 'none' : 'grayscale(1)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Gift size={16} />
            {claiming ? 'UNBOXING...' : `OPEN CRATE (${userData?.claimableRewards || 0})`}
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>Invited By</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Fingerprint size={10} color="#eab308" />
                <p style={{ fontSize: '10px', color: '#fff', fontWeight: 700, margin: 0 }}>
                  {userData?.referredBy ? `${userData.referredBy.slice(0, 8)}...` : 'LAAMTAG_ROOT'}
                </p>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>Total Recruits</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={12} color="#eab308" />
                <p style={{ fontSize: '14px', color: '#fff', fontWeight: 900, margin: 0 }}>{userData?._count?.referrals || 0}</p>
              </div>
            </div>
          </div>

          {/* NEW: FRIENDS TOGGLE BUTTON */}
          <button
            onClick={() => setIsFriendsOpen(!isFriendsOpen)}
            style={{
              width: '100%',
              background: isFriendsOpen ? '#eab308' : 'rgba(255,255,255,0.05)',
              color: isFriendsOpen ? '#000' : '#fff',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 900,
              transition: 'all 0.2s ease'
            }}
          >
            <Users size={16} />
            {isFriendsOpen ? 'HIDE ALLIED OPERATORS' : `VIEW ALLIED OPERATORS (${friends.length})`}
          </button>

          {/* NEW: COLLAPSIBLE FRIENDS LIST */}
          {isFriendsOpen && (
            <div className="friends-drawer" style={{
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '10px',
              border: '1px solid rgba(234,179,8,0.3)',
              maxHeight: '250px',
              overflowY: 'auto'
            }}>
              {friends.length === 0 ? (
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '10px' }}>NO NEURAL LINKS ESTABLISHED</p>
              ) : (
                friends.map(friend => {
                  const isMyTurn = friend.lastPokedBy !== publicKey?.toString();
                  const hasActiveStreak = (friend.streak || 0) > 0;

                  return (
                    <div key={friend.walletAddress} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                        {/* STREAK INDICATOR */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          background: hasActiveStreak ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: hasActiveStreak ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent'
                        }}>
                          <Flame
                            size={12}
                            color={hasActiveStreak ? '#ef4444' : '#555'}
                            fill={hasActiveStreak ? '#ef4444' : 'none'}
                          />
                          <span style={{ fontSize: '10px', fontWeight: 900, color: hasActiveStreak ? '#fff' : '#555' }}>
                            {friend.streak || 0}D
                          </span>
                        </div>

                        <div>
                          <p style={{ fontSize: '11px', fontWeight: 900, margin: 0, color: '#fff' }}>{friend.username || 'ANON'}</p>
                          <p style={{ fontSize: '8px', color: isMyTurn ? '#22c55e' : 'rgba(255,255,255,0.3)', margin: 0 }}>
                            {isMyTurn ? "READY TO NUDGE" : "WAITING FOR RESPONSE"}
                          </p>
                        </div>
                      </div>

                      <button
                        disabled={!isMyTurn}
                        onClick={async () => {
                          try {
                            await axios.post('/api/friends/poke', {
                              senderAddress: publicKey?.toString(),
                              receiverAddress: friend.walletAddress,
                              senderUsername: displayName
                            });
                            fetchFriends();
                          } catch (e: any) {
                            alert("Neural link nudge failed.");
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: isMyTurn ? 'pointer' : 'not-allowed',
                          color: isMyTurn ? '#eab308' : '#444',
                          transition: 'all 0.2s ease',
                          opacity: isMyTurn ? 1 : 0.4
                        }}
                      >
                        <Zap size={14} fill={isMyTurn ? "#eab308" : "none"} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* IDENTITY STATUS & REDIRECT BOX */}
        <div className="terminal-card" style={{ padding: '20px', marginBottom: '24px', border: '1px solid rgba(234,179,8,0.2)' }}>
          <p style={{ fontSize: '9px', fontWeight: 900, color: '#eab308', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>
            {userData?.username ? 'Verified Operator Callsign' : 'Callsign Not Registered'}
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={displayName}
                readOnly
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '10px 15px',
                  color: displayName.includes('.laam') ? '#eab308' : (displayName.includes('.skr') ? '#22d3ee' : 'rgba(255,255,255,0.3)'),
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  cursor: 'not-allowed'
                }}
              />
              {userData?.username && (
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '8px', fontWeight: 900, color: '#22c55e' }}>
                  VERIFIED
                </div>
              )}
            </div>

            {!userData?.username ? (
              <Link href="/laam" style={{ textDecoration: 'none' }}>
                <button
                  className="terminal-button"
                  style={{
                    background: '#eab308',
                    color: '#000',
                    padding: '0 20px',
                    fontSize: '10px',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  <ExternalLink size={14} />
                  GET .LAAM
                </button>
              </Link>
            ) : (
              <button
                disabled
                className="terminal-button"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.2)',
                  padding: '0 20px',
                  fontSize: '10px',
                  cursor: 'not-allowed'
                }}
              >
                LOCKED
              </button>
            )}
          </div>
        </div>

        {/* NEURAL WARRIORS SECTION */}
        <div style={{ marginBottom: '24px' }}>
          <WarriorGallery />
        </div>

        {/* NFT GALLERY (Genesis) */}
        <div style={{ paddingBottom: '100px' }}>
          <h2 style={{
            fontSize: '10px',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <span style={{ height: '1px', width: '30px', background: '#eab308' }}></span>
            My Genesis Collection
          </h2>

          <div className="terminal-card" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
            <NftGallery />
          </div>
        </div>

        <HistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
        />
      </div>
    </div>
  );
}