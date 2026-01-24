import { useWallet } from '@solana/wallet-adapter-react';
import Head from 'next/head';
import Link from 'next/link';
import SeekerGuard from '../components/SeekerGuard';
import { Zap, Clock, ShieldCheck, ArrowRight } from 'lucide-react';

export default function VaultPromoPage() {
  const { connected } = useWallet();

  return (
    <SeekerGuard>
      <div className="content-wrapper">
        <Head><title>LAAMTAG | The Vault Briefing</title></Head>

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 className="page-title">The <span style={{ color: '#eab308' }}>Vault</span></h1>
          <p className="terminal-desc" style={{ fontSize: '10px' }}>PROTOCOL: REWARD_STRUCTURE_v2.0</p>
        </div>

        {/* TOP INFO CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
          <div className="terminal-card" style={{ padding: '20px', textAlign: 'center', border: '1px solid rgba(255, 68, 68, 0.2)' }}>
            <Clock size={20} color="#ff4444" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '12px', margin: '0 0 5px' }}>48H INITIAL LOCK</h3>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Assets must stay locked for 48 hours before rewards begin accruing.</p>
          </div>
          <div className="terminal-card" style={{ padding: '20px', textAlign: 'center', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <Zap size={20} color="#a855f7" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '12px', margin: '0 0 5px' }}>24H CLAIM CYCLE</h3>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Sync your rewards to your wallet once every 24 hours.</p>
          </div>
        </div>

        {/* REWARD TABLE */}
        <div className="terminal-card" style={{ padding: '20px', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 900, marginBottom: '20px', textAlign: 'center' }}>EMISSION SCHEDULE</h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '10px', fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>ASSETS LOCKED</th>
                <th style={{ padding: '10px', fontSize: '10px', color: '#eab308' }}>DAILY LAAM</th>
                <th style={{ padding: '10px', fontSize: '10px', color: '#fff' }}>DAILY TAG</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <img src="/assets/images/vault-box.gif" style={{ width: '30px', borderRadius: '4px' }} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 900 }}>1 NFT</span>
                </td>
                <td style={{ fontSize: '14px', fontWeight: 900 }}>500</td>
                <td style={{ fontSize: '14px', fontWeight: 900 }}>20</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                    <img src="/assets/images/vault-box.gif" style={{ width: '25px', borderRadius: '4px' }} />
                    <img src="/assets/images/vault-box.gif" style={{ width: '25px', borderRadius: '4px' }} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 900 }}>2 NFTs</span>
                </td>
                <td style={{ fontSize: '14px', fontWeight: 900 }}>1000</td>
                <td style={{ fontSize: '14px', fontWeight: 900 }}>40</td>
              </tr>
              <tr>
                <td style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                    <img src="/assets/images/vault-box.gif" style={{ width: '20px', borderRadius: '4px' }} />
                    <img src="/assets/images/vault-box.gif" style={{ width: '20px', borderRadius: '4px', opacity: 0.6 }} />
                    <span style={{ fontSize: '12px' }}>...</span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 900 }}>UNLIMITED</span>
                </td>
                <td style={{ fontSize: '14px', fontWeight: 900, color: '#eab308' }}>+500 / NFT</td>
                <td style={{ fontSize: '14px', fontWeight: 900, color: '#fff' }}>+20 / NFT</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* CTA SECTION */}
        <div className="terminal-card" style={{ padding: '30px', textAlign: 'center', background: 'linear-gradient(to bottom, rgba(234, 179, 8, 0.05), transparent)' }}>
          <ShieldCheck size={40} color="#eab308" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '10px' }}>READY TO SECURE REWARDS?</h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '25px', lineHeight: '1.6' }}>
            Enter the Staking Arena to lock your Genesis Tags. <br/>
            Rewards are calculated per-second after your initial 48h deployment.
          </p>
          
          <Link href="/staking" style={{ textDecoration: 'none' }}>
            <button className="primary-btn" style={{ 
              width: '100%', 
              padding: '15px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px',
              fontSize: '14px',
              letterSpacing: '2px'
            }}>
              {connected ? "ENTER STAKING ARENA" : "CONNECT WALLET TO START"}
              <ArrowRight size={18} />
            </button>
          </Link>
        </div>
      </div>
    </SeekerGuard>
  );
}