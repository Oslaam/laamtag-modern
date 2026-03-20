import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { Loader2, Database, ShieldCheck, ExternalLink } from 'lucide-react';
import styles from '../styles/LootVault.module.css';

const THRESHOLD = 1000;

export default function LootVault() {
    const { publicKey } = useWallet();
    const [pending, setPending] = useState({ sol: 0, usdc: 0, skr: 0 });
    const [claiming, setClaiming] = useState<'SOL' | 'USDC' | 'SKR' | null>(null);
    const [lastSig, setLastSig] = useState<string | null>(null);

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
                skr: rewards.filter((r: any) => r.asset === 'SKR').reduce((a: number, b: any) => a + b.amount, 0),
            });
        } catch (err) { console.error('Failed to fetch loot', err); }
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
                assetType,
            });
            if (res.data.success && res.data.signature) setLastSig(res.data.signature);
            fetchLoot();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Claim failed');
        } finally {
            setClaiming(null);
        }
    };

    if (!publicKey) return null;

    return (
        <div className={styles.vault}>

            {/* ── HEADER ── */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Database size={15} className={styles.goldIcon} />
                    <div>
                        <h2 className={styles.title}>Loot Vault</h2>
                        <p className={styles.subtitle}>SECURE ASSET RETRIEVAL PROTOCOL</p>
                    </div>
                </div>
                <div className={styles.onlineBadge}>
                    <ShieldCheck size={9} />
                    <span>VAULT ONLINE</span>
                </div>
            </div>

            {/* ── ASSET GRID ── */}
            <div className={styles.assetGrid}>

                {/* SKR — liquid fill button */}
                <div className={`${styles.assetCell} ${styles.assetCellGold}`}>
                    <span className={`${styles.assetLabel} ${styles.assetLabelGold}`}>SKR</span>
                    <span className={styles.assetVal}>{pending.skr.toLocaleString()}</span>

                    <button
                        disabled={!canClaimSkr || claiming !== null}
                        onClick={() => handleClaim('SKR')}
                        className={`${styles.claimBtn} ${styles.claimBtnSkr} ${!canClaimSkr ? styles.claimBtnSkrLocked : ''}`}
                    >
                        <div
                            className={styles.liquidFill}
                            style={{
                                width: `${skrProgress}%`,
                                opacity: claiming === 'SKR' ? 0.4 : 1,
                            }}
                        />
                        <span className={styles.claimBtnText}>
                            {claiming === 'SKR' ? (
                                <Loader2 size={10} className={styles.spinner} />
                            ) : canClaimSkr ? (
                                'CLAIM'
                            ) : (
                                `${skrProgress.toFixed(0)}%`
                            )}
                        </span>
                    </button>

                    {!canClaimSkr && (
                        <p className={styles.thresholdNote}>MIN: {THRESHOLD.toLocaleString()} SKR</p>
                    )}
                </div>

                {/* SOL */}
                <div className={styles.assetCell}>
                    <span className={styles.assetLabel}>SOL</span>
                    <span className={styles.assetVal}>{pending.sol.toFixed(3)}</span>
                    <button
                        disabled={pending.sol <= 0 || claiming !== null}
                        onClick={() => handleClaim('SOL')}
                        className={`${styles.claimBtn} ${pending.sol > 0 ? styles.claimBtnReady : styles.claimBtnEmpty}`}
                    >
                        {claiming === 'SOL'
                            ? <Loader2 size={10} className={styles.spinner} />
                            : 'CLAIM'}
                    </button>
                </div>

                {/* USDC */}
                <div className={styles.assetCell}>
                    <span className={styles.assetLabel}>USDC</span>
                    <span className={`${styles.assetVal} ${styles.assetValBlue}`}>${pending.usdc.toFixed(2)}</span>
                    <button
                        disabled={pending.usdc <= 0 || claiming !== null}
                        onClick={() => handleClaim('USDC')}
                        className={`${styles.claimBtn} ${pending.usdc > 0 ? styles.claimBtnBlue : styles.claimBtnEmpty}`}
                    >
                        {claiming === 'USDC'
                            ? <Loader2 size={10} className={styles.spinner} />
                            : 'CLAIM'}
                    </button>
                </div>

            </div>

            {/* ── TX CONFIRMATION ── */}
            {lastSig && (
                <a
                    href={`https://solscan.io/tx/${lastSig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.txLink}
                >
                    <ShieldCheck size={10} />
                    TRANSACTION CONFIRMED — VIEW ON SOLSCAN
                    <ExternalLink size={9} />
                </a>
            )}
        </div>
    );
}