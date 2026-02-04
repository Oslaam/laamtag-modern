import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { Loader2, Database, ShieldCheck, ExternalLink } from 'lucide-react';

export default function LootVault() {
    const { publicKey } = useWallet();
    const [pending, setPending] = useState({ sol: 0, usdc: 0, skr: 0 });
    const [claiming, setClaiming] = useState<'SOL' | 'USDC' | 'SKR' | null>(null);
    const [lastSig, setLastSig] = useState<string | null>(null);

    // --- PROGRESS BAR SETTINGS ---
    const THRESHOLD = 1000;
    const skrProgress = Math.min((pending.skr / THRESHOLD) * 100, 100);
    const canClaimSkr = pending.skr >= THRESHOLD;

    const fetchLoot = async () => {
        if (!publicKey) return;
        try {
            const res = await axios.get(`/api/user/pending-loot?address=${publicKey.toBase58()}`);
            const rewards = (res.data.rewards || []).filter((r: any) => !r.isClaimed);

            setPending({
                sol: rewards.filter((r: any) => r.asset === 'SOL').reduce((a: number, b: any) => a + b.amount, 0),
                usdc: rewards.filter((r: any) => r.asset === 'USDC').reduce((a: number, b: any) => a + b.amount, 0),
                skr: rewards.filter((r: any) => r.asset === 'SKR').reduce((a: number, b: any) => a + b.amount, 0)
            });
        } catch (err) {
            console.error("Failed to fetch loot", err);
        }
    };

    useEffect(() => {
        if (publicKey) {
            fetchLoot();
            const interval = setInterval(fetchLoot, 30000);
            return () => clearInterval(interval);
        }
    }, [publicKey]);

    const handleClaim = async (assetType: 'SOL' | 'USDC' | 'SKR') => {
        if (!publicKey) return;
        setClaiming(assetType);
        setLastSig(null);

        try {
            const res = await axios.post('/api/user/claim-rewards', {
                walletAddress: publicKey.toBase58(),
                assetType: assetType
            });

            if (res.data.success && res.data.signature) {
                setLastSig(res.data.signature);
            }

            fetchLoot();
        } catch (err: any) {
            alert(err.response?.data?.message || "Claim failed");
        } finally {
            setClaiming(null);
        }
    };

    if (!publicKey) return null;

    return (
        <div className="terminal-card" style={{ marginTop: '32px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ color: '#eab308', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <Database size={18} /> Loot Vault
                    </h2>
                    <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontWeight: 900, marginTop: '4px', textTransform: 'uppercase' }}>
                        Secure Asset Retrieval Protocol (Auto-Syncing)
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34, 197, 94, 0.1)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <ShieldCheck size={10} color="#22c55e" />
                    <span style={{ fontSize: '8px', fontWeight: 900, color: '#22c55e', textTransform: 'uppercase' }}>Vault Online</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>

                {/* --- UPDATED SKR WITH PROGRESS BAR --- */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(234, 179, 8, 0.2)', textAlign: 'center' }}>
                    <p style={{ fontSize: '7px', color: '#eab308', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>SKR</p>
                    <p style={{ fontSize: '16px', fontWeight: 900, color: '#fff', margin: '0 0 12px 0' }}>{pending.skr.toLocaleString()}</p>

                    <button
                        disabled={!canClaimSkr || claiming !== null}
                        onClick={() => handleClaim('SKR')}
                        className="terminal-button"
                        style={{
                            width: '100%',
                            background: '#1a1a1a',
                            color: canClaimSkr ? '#000' : 'rgba(255,255,255,0.5)',
                            fontSize: '8px',
                            padding: '10px 4px',
                            border: '1px solid #eab308',
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: canClaimSkr ? 'pointer' : 'not-allowed',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {/* THE LIQUID FILL */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: `${skrProgress}%`,
                            background: '#eab308',
                            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                            zIndex: 0,
                            opacity: claiming === 'SKR' ? 0.5 : 1
                        }} />

                        {/* THE TEXT */}
                        <span style={{ position: 'relative', zIndex: 1, fontWeight: 900 }}>
                            {claiming === 'SKR' ? (
                                <Loader2 className="animate-spin" size={10} style={{ margin: '0 auto' }} />
                            ) : canClaimSkr ? (
                                "CLAIM"
                            ) : (
                                `${skrProgress.toFixed(0)}%`
                            )}
                        </span>
                    </button>
                    {!canClaimSkr && (
                        <p style={{ fontSize: '6px', color: 'rgba(255,255,255,0.3)', marginTop: '6px', fontWeight: 900 }}>
                            MIN: {THRESHOLD} SKR
                        </p>
                    )}
                </div>

                {/* SOL (Remains standard) */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                    <p style={{ fontSize: '7px', color: 'rgba(255,255,255,0.4)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>SOL</p>
                    <p style={{ fontSize: '16px', fontWeight: 900, color: '#fff', margin: '0 0 12px 0' }}>{pending.sol.toFixed(3)}</p>
                    <button
                        disabled={pending.sol <= 0 || claiming !== null}
                        onClick={() => handleClaim('SOL')}
                        className="terminal-button"
                        style={{ width: '100%', background: pending.sol > 0 ? '#eab308' : 'rgba(255,255,255,0.05)', color: pending.sol > 0 ? '#000' : 'rgba(255,255,255,0.2)', fontSize: '9px', padding: '8px 4px', opacity: (pending.sol <= 0 || claiming !== null) ? 0.3 : 1 }}
                    >
                        {claiming === 'SOL' ? <Loader2 className="animate-spin" size={10} style={{ margin: '0 auto' }} /> : "CLAIM"}
                    </button>
                </div>

                {/* USDC (Remains standard) */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                    <p style={{ fontSize: '7px', color: 'rgba(255,255,255,0.4)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>USDC</p>
                    <p style={{ fontSize: '16px', fontWeight: 900, color: '#3b82f6', margin: '0 0 12px 0' }}>${pending.usdc.toFixed(2)}</p>
                    <button
                        disabled={pending.usdc <= 0 || claiming !== null}
                        onClick={() => handleClaim('USDC')}
                        className="terminal-button"
                        style={{ width: '100%', background: pending.usdc > 0 ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: pending.usdc > 0 ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: '9px', padding: '8px 4px', opacity: (pending.usdc <= 0 || claiming !== null) ? 0.3 : 1 }}
                    >
                        {claiming === 'USDC' ? <Loader2 className="animate-spin" size={10} style={{ margin: '0 auto' }} /> : "CLAIM"}
                    </button>
                </div>
            </div>

            {lastSig && (
                <div style={{ marginTop: '16px', padding: '10px', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '8px', textAlign: 'center' }}>
                    <a
                        href={`https://solscan.io/tx/${lastSig}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#22c55e', fontSize: '9px', fontWeight: 900, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                        TRANSACTION CONFIRMED - VIEW ON SOLSCAN <ExternalLink size={10} />
                    </a>
                </div>
            )}
        </div>
    );
}