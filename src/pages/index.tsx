import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import SeekerGuard from '../components/SeekerGuard';

export default function AppHome() {
  const { connected } = useWallet();

  return (
    <div className="main-content">
      <Head>
        <title>LaamTag App | Hub</title>
      </Head>

      {!connected ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <h1 className="page-title" style={{ color: '#eab308', fontSize: '3.5rem' }}>
            LAAMTAG<br />HUB
          </h1>
          <p className="terminal-desc" style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
            System Locked. Connect Seeker Wallet to Initialize.
          </p>
        </div>
      ) : (
        <SeekerGuard>
          <div className="content-wrapper">
            <div style={{ padding: '24px 0' }}>
              <h2 className="page-title">
                Welcome <br />
                <span style={{ color: '#eab308' }}>Seeker Universe</span>
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* MINT CARD */}
              <Link href="/mint" style={{ textDecoration: 'none' }}>
                <div className="terminal-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 className="terminal-link">Mint Genesis</h3>
                      <p className="terminal-desc">Claim Tag & Unlock Multipliers</p>
                    </div>
                    <div style={{ background: '#eab308', color: '#000', padding: '4px 12px', borderRadius: '6px', fontWeight: 900, fontSize: '10px' }}>
                      01
                    </div>
                  </div>
                </div>
              </Link>

              {/* QUESTS CARD */}
              <Link href="/quests" style={{ textDecoration: 'none' }}>
                <div className="terminal-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 className="terminal-link">Quest Hub</h3>
                      <p className="terminal-desc">Complete Missions to earn LAAM</p>
                    </div>
                    <div style={{ background: '#fff', color: '#000', padding: '4px 12px', borderRadius: '6px', fontWeight: 900, fontSize: '10px' }}>
                      02
                    </div>
                  </div>
                </div>
              </Link>

               {/* GAMES CARD */}
              <Link href="/games" style={{ textDecoration: 'none' }}>
                <div className="terminal-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 className="terminal-link">Games Center</h3>
                      <p className="terminal-desc">Play Games to Earn Multiple Rewards</p>
                    </div>
                    <div style={{ background: '#eab308', color: '#000', padding: '4px 12px', borderRadius: '6px', fontWeight: 900, fontSize: '10px' }}>
                      03
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </SeekerGuard>
      )}
    </div>
  );
}