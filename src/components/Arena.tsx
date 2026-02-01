import React from 'react';
import { Swords } from 'lucide-react';
import SeekerGuard from '../components/SeekerGuard';

const ArenaComingSoon = () => {
    return (
        <SeekerGuard>
            <div className="main-content">
                <div className="content-wrapper">

                    {/* 1. VIDEO SECTION - Following Modern GIF style */}
                    <div style={{ marginBottom: '2rem', position: 'relative' }}>
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)', // Red tint for Arena
                            borderRadius: '32px',
                            padding: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            overflow: 'hidden'
                        }}>
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                style={{
                                    width: '100%',
                                    borderRadius: '24px',
                                    aspectRatio: '21/9',
                                    objectFit: 'cover',
                                    opacity: 0.6
                                }}
                            >
                                <source src="/assets/images/PvP-Arena.MP4" type="video/mp4" />
                                [SYSTEM_ERROR: VIDEO_NOT_FOUND]
                            </video>
                        </div>
                    </div>

                    {/* 2. CONTENT HEADER AREA */}
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
                            <Swords size={24} style={{ color: '#ef4444' }} />
                            <h1 className="page-title" style={{ color: '#fff', margin: 0 }}>
                                PVP <span style={{ color: '#ef4444' }}>ARENA</span>
                            </h1>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <div style={{ backgroundColor: '#ef4444', color: '#fff', padding: '2px 8px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>
                                Coming Soon
                            </div>
                            <div style={{ border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '2px 8px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>
                                High Stakes
                            </div>
                        </div>
                    </div>

                    {/* 3. PROGRESS CARD - Following Mint.tsx pattern */}
                    <div className="terminal-card" style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5 }}>Deployment Status</span>
                            <span style={{ fontSize: '14px', fontWeight: 900, color: '#ef4444' }}>
                                Testing <span style={{ opacity: 0.3, fontSize: '10px' }}>/ STABLE</span>
                            </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{
                                width: '25%',
                                height: '100%',
                                background: '#ef4444',
                                boxShadow: '0 0 10px #ef4444'
                            }} />
                        </div>
                    </div>

                    {/* 4. DESCRIPTION BOX */}
                    <div className="terminal-card">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <p className="terminal-desc" style={{ margin: 0, lineHeight: '1.6' }}>
                                Prepare your gear and sharpen your skills. The ultimate battlefield for <span style={{ color: '#fff', fontWeight: 'bold' }}>Seeker</span> users.
                                Compete in high-stakes combat using <span style={{ color: '#ef4444', fontWeight: 900 }}>$SKR</span> as entry
                                and dominate to earn <span style={{ color: '#ef4444', fontWeight: 900 }}>$SKR</span> rewards.
                            </p>

                            <div style={{
                                padding: '12px',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                background: 'rgba(0,0,0,0.3)',
                                textAlign: 'center'
                            }}>
                                <p style={{ fontSize: '10px', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', margin: 0 }}>
                                    System Status: Deploying Combat Modules
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            {/* Background Atmosphere */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_rgba(220,38,38,0.05)_0%,_transparent_70%)] pointer-events-none" />
        </SeekerGuard>
    );
};

export default ArenaComingSoon;