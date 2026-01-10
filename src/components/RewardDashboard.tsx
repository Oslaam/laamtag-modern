'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { ShieldCheck, History, Clock, ArrowUpRight, Loader2 } from 'lucide-react';

export default function RewardDashboard() {
    const { publicKey } = useWallet();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ history: [], pending: [] });

    const fetchData = useCallback(async () => {
        if (!publicKey) return;
        try {
            const res = await fetch(`/api/user/rewards?walletAddress=${publicKey.toBase58()}`);
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error("Ledger fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [publicKey]);

    const handleClaim = async (id: string) => {
        if (!publicKey) return;

        const res = await fetch('/api/user/rewards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                walletAddress: publicKey.toBase58(),
                action: 'claim',
                rewardId: id
            })
        });

        if (res.ok) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#eab308', '#ffffff', '#111111']
            });
            toast.success("ASSET SECURED IN VAULT", {
                style: { background: '#000', color: '#eab308', border: '1px solid #eab308', fontSize: '10px', fontWeight: 900 }
            });
            fetchData();
        } else {
            toast.error("EXTRACTION FAILED");
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (!publicKey) return null;

    return (
        <div style={{ width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* 1. PENDING CLAIMS SECTION */}
            {data.pending.length > 0 && (
                <div className="terminal-card" style={{
                    borderLeft: '4px solid #eab308',
                    background: 'linear-gradient(90deg, rgba(234,179,8,0.05) 0%, rgba(0,0,0,0) 100%)',
                    padding: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Clock size={14} className="text-yellow-500" />
                        <h3 style={{ color: '#eab308', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>
                            Pending Extraction
                        </h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {data.pending.map((r: any) => (
                            <div key={r.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: '#000', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <span style={{ color: '#fff', fontWeight: 900, fontStyle: 'italic', fontSize: '14px' }}>
                                    {r.amount} <span style={{ color: '#eab308', fontSize: '10px' }}>{r.asset}</span>
                                </span>
                                <button
                                    onClick={() => handleClaim(r.id)}
                                    className="terminal-button"
                                    style={{ padding: '6px 16px', fontSize: '10px', background: '#fff', color: '#000' }}
                                >
                                    CLAIM
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 2. TRANSACTION HISTORY LEDGER */}
            <div className="terminal-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <History size={14} className="text-white/30" />
                        <h3 style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                            Extraction Ledger
                        </h3>
                    </div>
                    {loading && <Loader2 size={12} className="animate-spin text-white/20" />}
                </div>

                <div className="custom-scrollbar" style={{
                    maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px',
                    paddingRight: '8px'
                }}>
                    {data.history.length === 0 && !loading ? (
                        <p style={{ color: 'rgba(255,255,255,0.1)', fontSize: '10px', textAlign: 'center', padding: '20px' }}>
                            NO RECORDED ACTIVITY
                        </p>
                    ) : (
                        data.history.map((h: any) => (
                            <div key={h.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <p style={{ color: '#fff', fontWeight: 900, fontSize: '11px', textTransform: 'uppercase', margin: 0 }}>
                                        {h.type.replace('_', ' ')}
                                    </p>
                                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px', fontWeight: 700, margin: 0 }}>
                                        {new Date(h.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{
                                        color: h.amount >= 0 ? '#eab308' : '#ef4444',
                                        fontWeight: 900, fontSize: '12px'
                                    }}>
                                        {h.amount >= 0 ? '+' : ''}{h.amount}
                                    </span>
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '8px', fontWeight: 900, marginLeft: '4px' }}>
                                        {h.asset}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}