import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import toast, { Toaster } from 'react-hot-toast';
import SeekerGuard from '../components/SeekerGuard';

export default function VaultPage() {
  const { publicKey } = useWallet();
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);

  const fetchVaultStatus = async () => {
    if (!publicKey) return;
    try {
      const res = await fetch(`/api/claim-nft-reward?address=${publicKey.toString()}`);
      const data = await res.json();
      if (data.hasClaimed) setHasClaimed(true);
    } catch (err) {
      console.error("Vault status error", err);
    }
  };

  useEffect(() => { fetchVaultStatus(); }, [publicKey]);

  const handleClaim = async () => {
    if (!publicKey) return toast.error("Connect Wallet");
    setIsClaiming(true);
    try {
      const res = await fetch('/api/claim-nft-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toString() })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("1,000 LAAM SECURED");
        setHasClaimed(true);
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      toast.error("Verification failed");
    } finally {
      setIsClaiming(false);
    }
  };

  const displayName = publicKey ? `${publicKey.toString().slice(0, 4)}.skr` : "Seeker";

  return (
    <SeekerGuard>
      {/* main-content is handled by _app.tsx layout, so we just need content-wrapper here */}
      <div className="content-wrapper">
        <Head><title>LAAMTAG | The Vault</title></Head>
        <Toaster />

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="page-title">The <span style={{ color: '#eab308' }}>Vault</span></h1>
          <p className="terminal-desc" style={{ fontSize: '10px' }}>SYSTEM STATUS: LOCKED</p>
        </div>

        {/* VAULT CARD - This keeps everything contained */}
        <div className="terminal-card" style={{ padding: '1.5rem' }}>

          {/* IMAGE CONTAINER - Prevents "Giant Image" issue */}
          <div style={{
            width: '100%',
            aspectRatio: '1/1',
            borderRadius: '24px',
            overflow: 'hidden',
            marginBottom: '1.5rem',
            border: '1px solid rgba(255,255,255,0.1)',
            background: '#000'
          }}>
            <img
              src="/assets/images/vault-box.gif" // Or your specific NFT image path
              alt="Vault Box"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Vault Lock
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '1.5rem' }}>
              Lock Genesis Tags for <span style={{ color: '#eab308' }}>500 LAAM</span> & <span style={{ color: '#fff' }}>20 TAG</span> daily.
            </p>

            {/* STATS GRID INSIDE CARD */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>STAKED</p>
                <p style={{ fontSize: '16px', fontWeight: 900, margin: 0 }}>5 NFTs</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>COOLDOWN</p>
                <p style={{ fontSize: '16px', fontWeight: 900, margin: 0 }}>48 Hours</p>
              </div>
            </div>

            <button
              onClick={handleClaim}
              disabled={hasClaimed || isClaiming}
              className="primary-btn"
              style={{
                backgroundColor: hasClaimed ? 'rgba(255,255,255,0.1)' : '#eab308',
                color: hasClaimed ? 'rgba(255,255,255,0.3)' : '#000',
              }}
            >
              {hasClaimed ? "REWARD SECURED ✓" : isClaiming ? "PROCESSING..." : "CLAIM DAILY REWARD"}
            </button>
          </div>
        </div>
      </div>
    </SeekerGuard>
  );
}