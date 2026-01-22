import Head from 'next/head';
import SeekerGuard from '../components/SeekerGuard';
import { Lock } from 'lucide-react';

export default function BankPage() {
    return (
        <SeekerGuard>
            <div className="main-content">
                <Head><title>LAAMTAG | Bank</title></Head>

                <div className="content-wrapper">
                    {/* HEADER */}
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h1 className="page-title" style={{ color: '#22d3ee' }}>
                            The <span style={{ color: '#fff' }}>Bank</span>
                        </h1>
                        <p className="terminal-desc" style={{ fontSize: '10px' }}>
                            MODULE: ASSET_MANAGEMENT_v4
                        </p>
                    </div>

                    {/* COMING SOON CARD */}
                    <div className="terminal-card" style={{
                        padding: '60px 24px',
                        textAlign: 'center',
                        border: '1px solid rgba(34, 211, 238, 0.2)', // Cyan border
                        background: 'radial-gradient(circle at top, rgba(34, 211, 238, 0.05) 0%, transparent 70%)'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'rgba(34, 211, 238, 0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            border: '1px solid rgba(34, 211, 238, 0.3)'
                        }}>
                            <Lock size={32} className="text-cyan-400" />
                        </div>

                        <h2 style={{
                            fontSize: '24px',
                            fontWeight: 900,
                            fontStyle: 'italic',
                            textTransform: 'uppercase',
                            marginBottom: '12px',
                            letterSpacing: '-0.02em'
                        }}>
                            Access Restricted
                        </h2>

                        <p style={{
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '13px',
                            maxWidth: '280px',
                            margin: '0 auto 32px',
                            lineHeight: '1.6'
                        }}>
                            The Banking Terminal is currently undergoing <span style={{ color: '#22d3ee' }}>protocol synchronization</span>. Check back soon for asset bridging and asset staking.
                        </p>

                        {/* FAKE PROGRESS BAR */}
                        <div style={{
                            width: '100%',
                            maxWidth: '200px',
                            height: '4px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '10px',
                            margin: '0 auto',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                height: '100%',
                                width: '65%',
                                background: '#22d3ee',
                                boxShadow: '0 0 10px #22d3ee'
                            }}></div>
                        </div>
                        <p style={{ fontSize: '8px', color: '#22d3ee', fontWeight: 900, marginTop: '10px' }}>
                            DECRYPTING: 65% COMPLETE
                        </p>
                    </div>

                    {/* FEATURES TEASER */}
                    <div style={{
                        marginTop: '24px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px'
                    }}>
                        <div className="terminal-card" style={{ padding: '16px', background: 'transparent' }}>
                            <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>UPCOMING</p>
                            <p style={{ fontSize: '12px', fontWeight: 900, margin: '4px 0 0 0' }}>Staking V2 🔓</p>
                        </div>
                        <div className="terminal-card" style={{ padding: '16px', background: 'transparent' }}>
                            <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>UPCOMING</p>
                            <p style={{ fontSize: '12px', fontWeight: 900, margin: '4px 0 0 0' }}>LAAM 🔓</p>
                        </div>
                    </div>
                </div>
            </div>
        </SeekerGuard>
    );
}