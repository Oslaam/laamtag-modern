import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Coins, Trophy, ShieldCheck, UserPen, Save, Loader2 } from 'lucide-react';
import NftGallery from '../components/NftGallery';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { publicKey } = useWallet();
  // Added 'username' to the state type
  const [userData, setUserData] = useState<{
    laamPoints: number;
    rank: string;
    personalMinted: number;
    username?: string;
  } | null>(null);

  const [newUsername, setNewUsername] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!publicKey) return;
    fetch(`/api/user/${publicKey.toString()}`)
      .then(res => res.json())
      .then(statsData => {
        setUserData(statsData || null);
        if (statsData?.username) setNewUsername(statsData.username);
      })
      .catch(err => console.error("Profile fetch error", err));
  }, [publicKey]);

  const handleUpdateUsername = async () => {
    if (!publicKey || !newUsername.trim()) return;
    setIsUpdating(true);

    try {
      const res = await fetch('/api/user/update-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          username: newUsername.trim()
        })
      });

      if (res.ok) {
        toast.success("IDENTITY UPDATED IN DATABASE");
        // Update local state so header reflects change
        setUserData(prev => prev ? { ...prev, username: newUsername } : null);
      } else {
        toast.error("UPDATE REJECTED");
      }
    } catch (error) {
      toast.error("COMMUNICATION ERROR");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="main-content">
      <div className="content-wrapper">

        {/* HEADER SECTION */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px'
        }}>
          <Link href="/" style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '12px',
            borderRadius: '12px',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <ArrowLeft size={20} />
          </Link>
          <div style={{ textAlign: 'right' }}>
            <p className="terminal-desc" style={{ color: '#eab308', margin: 0 }}>
              {userData?.username || 'SEEKER'} PROFILE
            </p>
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
          <h2 style={{ fontSize: '24px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', margin: 0 }}>
            {userData?.rank || 'NEOPHYTE'}
          </h2>
          <p style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', marginTop: '4px' }}>
            CURRENT CLEARANCE LEVEL
          </p>
        </div>

        {/* USERNAME UPDATE BOX */}
        <div className="terminal-card" style={{ padding: '20px', marginBottom: '24px', border: '1px solid rgba(234,179,8,0.2)' }}>
          <p style={{ fontSize: '9px', fontWeight: 900, color: '#eab308', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>
            Modify Operator Callsign
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="ENTER NEW NAME..."
              maxLength={15}
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '10px 15px',
                color: '#fff',
                fontSize: '12px',
                fontFamily: 'monospace',
                outline: 'none'
              }}
            />
            <button
              onClick={handleUpdateUsername}
              disabled={isUpdating}
              className="terminal-button"
              style={{
                background: '#fff',
                color: '#000',
                padding: '0 20px',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              SAVE
            </button>
          </div>
        </div>

        {/* STATS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '40px' }}>
          <div className="terminal-card" style={{ padding: '20px', textAlign: 'center' }}>
            <Coins className="text-yellow-500" size={20} style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: '20px', fontWeight: 900, margin: 0 }}>
              {userData?.laamPoints?.toLocaleString() || 0}
            </p>
            <p style={{ fontSize: '8px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
              Total LAAM
            </p>
          </div>

          <div className="terminal-card" style={{ padding: '20px', textAlign: 'center' }}>
            <Trophy className="text-yellow-500" size={20} style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: '20px', fontWeight: 900, margin: 0 }}>
              {userData?.personalMinted || 0}
            </p>
            <p style={{ fontSize: '8px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
              NFTs Minted
            </p>
          </div>
        </div>

        {/* NFT GALLERY SECTION */}
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

      </div>
    </div>
  );
}