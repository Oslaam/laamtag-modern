import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Coins, Trophy, ShieldCheck, Save, Loader2, History } from 'lucide-react';
import NftGallery from '../components/NftGallery';
import HistoryModal from '../components/HistoryModal';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { publicKey } = useWallet();
  const [userData, setUserData] = useState<{
    laamPoints: number;
    rank: string;
    personalMinted: number;
    username?: string;
  } | null>(null);

  const [newUsername, setNewUsername] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // States for Availability and Validation
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // 1. INITIAL FETCH: Ensures the saved username shows up permanently on load
  useEffect(() => {
    if (!publicKey) return;
    fetch(`/api/user/${publicKey.toString()}`)
      .then(res => res.json())
      .then(statsData => {
        setUserData(statsData || null);
        if (statsData?.username) {
          setNewUsername(statsData.username); // Fills the box permanently
        }
      })
      .catch(err => console.error("Profile fetch error", err));
  }, [publicKey]);

  // 2. AVAILABILITY CHECK: Only checks if the name is 3+ chars and different from current
  useEffect(() => {
    const checkName = async () => {
      if (!newUsername || newUsername === userData?.username || newUsername.length < 3) {
        setIsAvailable(null);
        return;
      }

      setIsValidating(true);
      try {
        const res = await fetch(`/api/user/check-username?username=${newUsername}`);
        const data = await res.json();
        setIsAvailable(data.available);
      } catch (err) {
        console.error("Check error", err);
      } finally {
        setIsValidating(false);
      }
    };

    const timeoutId = setTimeout(checkName, 500);
    return () => clearTimeout(timeoutId);
  }, [newUsername, userData?.username]);

  // 3. SAVE LOGIC
  const handleUpdateUsername = async () => {
    if (!publicKey || newUsername.length < 3) return;
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

      const updatedData = await res.json();

      if (res.ok) {
        toast.success("IDENTITY UPDATED");
        // Update local state so the Save button disables again
        setUserData(prev => prev ? { ...prev, username: updatedData.username } : null);
        setNewUsername(updatedData.username);
        setIsAvailable(null);
      } else {
        toast.error("UPDATE REJECTED");
      }
    } catch (error) {
      toast.error("COMMUNICATION ERROR");
    } finally {
      setIsUpdating(false);
    }
  };

  // HELPER: Logic to decide if the button should be clickable
  // Button is disabled IF: 
  // - Already updating
  // - Validating (checking API)
  // - Name is too short
  // - Name is the SAME as what's already saved
  // - Name is TAKEN (isAvailable === false)
  const isSaveDisabled =
    isUpdating ||
    isValidating ||
    newUsername.length < 3 ||
    newUsername === userData?.username ||
    isAvailable === false;

  return (
    <div className="main-content">
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
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="ENTER NEW NAME..."
                maxLength={15}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  border: `1px solid ${isAvailable === true ? '#22c55e' :
                      isAvailable === false ? '#ef4444' : 'rgba(255,255,255,0.1)'
                    }`,
                  borderRadius: '8px',
                  padding: '10px 15px',
                  color: '#fff',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
              />

              <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '8px', fontWeight: 900 }}>
                {isValidating && <span className="animate-pulse" style={{ color: '#eab308' }}>CHECKING...</span>}
                {!isValidating && isAvailable === true && <span style={{ color: '#22c55e' }}>AVAILABLE</span>}
                {!isValidating && isAvailable === false && <span style={{ color: '#ef4444' }}>TAKEN</span>}
                {!isValidating && newUsername.length > 0 && newUsername.length < 3 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>TOO SHORT</span>}
              </div>
            </div>

            <button
              onClick={handleUpdateUsername}
              disabled={isSaveDisabled}
              className="terminal-button"
              style={{
                background: isSaveDisabled ? 'rgba(255,255,255,0.05)' : '#fff',
                color: isSaveDisabled ? 'rgba(255,255,255,0.2)' : '#000',
                padding: '0 20px',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: isSaveDisabled ? 'not-allowed' : 'pointer'
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

        <HistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
        />

      </div>
    </div>
  );
}