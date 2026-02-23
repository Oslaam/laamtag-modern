'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from '../styles/PulseHunter.module.css';
import { useWallet } from '@solana/wallet-adapter-react';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import {
    mplToolbox,
    transferTokens,
    findAssociatedTokenPda,
    setComputeUnitPrice
} from "@metaplex-foundation/mpl-toolbox";
import { base58 } from "@metaplex-foundation/umi/serializers";
import toast from 'react-hot-toast';
import { publicKey as umiPk } from '@metaplex-foundation/umi';
import { Radio, XCircle, Zap, Loader2, Target, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

const STORAGE_KEY = 'pendingUnlock_pulseHunter';

export default function PulseHunter({ user, onUpdateUser }) {
    const { publicKey } = useWallet();
    const wallet = useWallet();

    const [loading, setLoading] = useState(false);
    const [recovering, setRecovering] = useState(false);
    const [guess, setGuess] = useState('');
    const [message, setMessage] = useState('INITIATE SIGNAL SCAN...');
    const [attempts, setAttempts] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [lockoutTimer, setLockoutTimer] = useState<string | null>(null);
    const [lastAttemptTimestamp, setLastAttemptTimestamp] = useState<number | null>(null);
    const [pendingSignature, setPendingSignature] = useState<string | null>(null);
    const [unlockStatus, setUnlockStatus] = useState<string>('');

    const getInstructionMessage = (currentAttempts: number) => {
        if (currentAttempts === 0) return "PICK A NUMBER (1-100) TO WIN 1,000 $SKR";
        if (currentAttempts === 1) return "TRY AGAIN (1-100) FOR 500 $SKR";
        if (currentAttempts === 2) return "FINAL ATTEMPT (1-100) FOR 100 $SKR";
        return "SIGNAL LOST";
    };

    // ─── On mount: check localStorage for a pending unlock ──────────────────────
    useEffect(() => {
        if (!publicKey || user.hasPulseHunterUnlocked) return;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const { signature, walletAddress, timestamp } = JSON.parse(raw);

            // Expire after 2 hours
            if (Date.now() - timestamp > 2 * 60 * 60 * 1000) {
                localStorage.removeItem(STORAGE_KEY);
                return;
            }
            // Only recover for the same wallet
            if (walletAddress !== publicKey.toString()) return;

            setPendingSignature(signature);
            autoRetryUnlock(signature, walletAddress);
        } catch (_) {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [publicKey, user.hasPulseHunterUnlocked]);

    // ─── Silent auto-retry on mount ─────────────────────────────────────────────
    const autoRetryUnlock = async (sig: string, walletAddr: string) => {
        setUnlockStatus("RECOVERING PREVIOUS SESSION...");
        try {
            const res = await fetch('/api/games/pulse-hunter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: walletAddr, action: 'unlock', signature: sig })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.removeItem(STORAGE_KEY);
                setPendingSignature(null);
                setUnlockStatus('');
                onUpdateUser({ ...user, hasPulseHunterUnlocked: true });
                toast.success("SIGNAL UNLOCKED (RECOVERED)");
            } else {
                setUnlockStatus("AUTO-RECOVER FAILED. USE RECOVER BUTTON BELOW.");
            }
        } catch (_) {
            setUnlockStatus("AUTO-RECOVER FAILED. USE RECOVER BUTTON BELOW.");
        }
    };

    // ─── Manual recover button handler ──────────────────────────────────────────
    const handleRecover = useCallback(async () => {
        if (!pendingSignature || !publicKey) return;
        setRecovering(true);
        setUnlockStatus("VERIFYING SIGNAL ON-CHAIN...");
        try {
            const res = await fetch('/api/games/pulse-hunter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    action: 'unlock',
                    signature: pendingSignature
                })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.removeItem(STORAGE_KEY);
                setPendingSignature(null);
                setUnlockStatus('');
                onUpdateUser({ ...user, hasPulseHunterUnlocked: true });
                toast.success("SIGNAL UNLOCKED");
            } else {
                setUnlockStatus(data.error || "RECOVERY FAILED. TRY AGAIN.");
                toast.error(data.error || "RECOVERY FAILED");
            }
        } catch (err) {
            setUnlockStatus("NETWORK ERROR. CHECK CONNECTION AND RETRY.");
            toast.error("NETWORK ERROR");
        } finally {
            setRecovering(false);
        }
    }, [pendingSignature, publicKey, user, onUpdateUser]);

    // ─── Fetch initial game state ────────────────────────────────────────────────
    useEffect(() => {
        if (!publicKey) return;
        const fetchGameState = async () => {
            try {
                const res = await fetch(`/api/games/pulse-hunter?walletAddress=${publicKey.toString()}`);
                const data = await res.json();
                if (res.ok && data) {
                    setAttempts(data.attempts || 0);
                    if (data.lastAttempt) {
                        const timestamp = new Date(data.lastAttempt).getTime();
                        setLastAttemptTimestamp(timestamp);
                        const cooldownEnd = timestamp + (2 * 60 * 60 * 1000);
                        setIsLocked(Date.now() < cooldownEnd && data.isLocked);
                    }
                }
            } catch (err) { console.error("Sync Error"); }
        };
        fetchGameState();
    }, [publicKey]);

    // ─── 2-Hour Countdown Timer ──────────────────────────────────────────────────
    useEffect(() => {
        if (!isLocked || !lastAttemptTimestamp) return;
        const interval = setInterval(() => {
            const cooldownEnd = lastAttemptTimestamp + (2 * 60 * 60 * 1000);
            const diff = cooldownEnd - Date.now();
            if (diff <= 0) {
                setIsLocked(false);
                setLockoutTimer(null);
                setAttempts(0);
                setMessage('INITIATE SIGNAL SCAN...');
                clearInterval(interval);
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const secs = Math.floor((diff % (1000 * 60)) / 1000);
                setLockoutTimer(`${hours}H ${mins}M ${secs}S`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isLocked, lastAttemptTimestamp]);

    // ─── Handle Guess ────────────────────────────────────────────────────────────
    const handleGuess = useCallback(async () => {
        const numGuess = parseInt(guess);
        if (!guess || isNaN(numGuess) || numGuess < 1 || numGuess > 100 || loading || isLocked) {
            toast.error("ENTER A NUMBER BETWEEN 1-100");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/games/pulse-hunter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: user.walletAddress, action: 'guess', userGuess: guess })
            });
            const data = await res.json();
            if (data.win) {
                setMessage(`JACKPOT! SIGNAL MATCHED ON ATTEMPT ${data.attemptUsed}. +${data.prize} $SKR`);
                setIsLocked(true);
                setAttempts(data.attemptUsed);
                setLastAttemptTimestamp(Date.now());
                toast.success("REWARD ADDED TO VAULT");
            } else {
                setAttempts(data.attempts);
                setMessage(data.message.toUpperCase());
                if (data.locked) {
                    setIsLocked(true);
                    setLastAttemptTimestamp(Date.now());
                }
            }
            setGuess('');
        } catch (err) { setMessage("SCAN ERROR"); }
        finally { setLoading(false); }
    }, [guess, loading, isLocked, user.walletAddress]);

    // ─── Handle Unlock ───────────────────────────────────────────────────────────
    const handleUnlock = useCallback(async () => {
        if (!wallet.publicKey || !wallet.wallet) {
            toast.error("WALLET NOT CONNECTED");
            return;
        }
        setLoading(true);
        setUnlockStatus("INITIATING PAYMENT...");
        const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";

        try {
            const umi = createUmi(RPC_URL)
                .use(walletAdapterIdentity(wallet.wallet.adapter as any))
                .use(mplToolbox());

            const SKR_MINT_UMI = umiPk("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");
            const TREASURY_UMI = umiPk("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc");

            const source = findAssociatedTokenPda(umi, { mint: SKR_MINT_UMI, owner: umiPk(wallet.publicKey.toBase58()) })[0];
            const destination = findAssociatedTokenPda(umi, { mint: SKR_MINT_UMI, owner: TREASURY_UMI })[0];

            setUnlockStatus("AWAITING WALLET APPROVAL...");

            const result = await setComputeUnitPrice(umi, { microLamports: 50000 })
                .add(transferTokens(umi, { source, destination, authority: umi.identity, amount: BigInt(200_000_000) }))
                .sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });

            const sig = base58.deserialize(result.signature)[0];

            // ── Save to localStorage IMMEDIATELY after on-chain confirm ──
            // This is the critical safety net for mobile connection drops
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                signature: sig,
                walletAddress: wallet.publicKey.toString(),
                timestamp: Date.now()
            }));
            setPendingSignature(sig);

            setUnlockStatus("PAYMENT CONFIRMED. ACTIVATING...");

            const res = await fetch('/api/games/pulse-hunter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: user.walletAddress, action: 'unlock', signature: sig })
            });

            const data = await res.json();
            if (data.success) {
                localStorage.removeItem(STORAGE_KEY);
                setPendingSignature(null);
                setUnlockStatus('');
                onUpdateUser({ ...user, hasPulseHunterUnlocked: true });
                toast.success("SIGNAL UNLOCKED");
            } else {
                setUnlockStatus("ACTIVATION FAILED. YOUR PAYMENT IS SAFE — USE RECOVER BUTTON.");
                toast.error("ACTIVATION FAILED — USE RECOVER BUTTON");
            }
        } catch (err: any) {
            if (pendingSignature) {
                setUnlockStatus("CONNECTION DROPPED. YOUR PAYMENT IS SAFE — USE RECOVER BUTTON BELOW.");
                toast.error("CONNECTION DROPPED. USE RECOVER BUTTON.");
            } else {
                setUnlockStatus('');
                toast.error("DECRYPTION FAILED");
            }
        } finally {
            setLoading(false);
        }
    }, [wallet, user, onUpdateUser, pendingSignature]);

    // ─── PRE-UNLOCK SCREEN ───────────────────────────────────────────────────────
    if (!user.hasPulseHunterUnlocked) {
        return (
            <div className={styles.container}>
                <div className={styles.glassFrame}>
                    <Zap color="#eab308" className={styles.pulseIcon} />
                    <h2 className={styles.glitchText}>PULSE HUNTER</h2>
                    <p className={styles.dimText}>ENCRYPTED SIGNAL DETECTED</p>

                    {unlockStatus && (
                        <p className={styles.statusMsg}>{unlockStatus}</p>
                    )}

                    {pendingSignature && !loading && (
                        <button
                            onClick={handleRecover}
                            className={styles.recoverButton}
                            disabled={recovering}
                        >
                            {recovering
                                ? <><Loader2 className="animate-spin" size={14} style={{ display: 'inline' }} /> RECOVERING...</>
                                : <><RefreshCw size={14} style={{ display: 'inline', marginRight: 6 }} /> RECOVER ACCESS (TX ALREADY SENT)</>
                            }
                        </button>
                    )}

                    <button
                        onClick={handleUnlock}
                        className={styles.unlockButton}
                        disabled={loading || recovering}
                    >
                        {loading
                            ? <><Loader2 className="animate-spin" size={14} style={{ display: 'inline' }} /> PROCESSING...</>
                            : "DECRYPT ACCESS (200 $SKR)"
                        }
                    </button>
                </div>
            </div>
        );
    }

    // ─── GAME SCREEN ─────────────────────────────────────────────────────────────
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.statusGroup}>
                    <Radio className={isLocked ? styles.offlineIcon : styles.pulseIcon} size={18} />
                    <span className={styles.statusText}>{isLocked ? "OFFLINE" : "LIVE SIGNAL"}</span>
                </div>
                <div className={styles.attemptsBadge}>
                    ATTEMPTS: <span className={styles.highlight}>{attempts}/3</span>
                </div>
            </div>

            <div className={styles.displayArea}>
                {isLocked ? (
                    <div className={styles.lockoutBox}>
                        <XCircle color="#ef4444" size={32} />
                        <p className={styles.terminalText}>{message.includes("JACKPOT") ? "EXTRACTION COMPLETE" : "SIGNAL DROPPED"}</p>
                        <p className={styles.revealText}>{message}</p>
                        <div className={styles.timerWrapper}>
                            <p className={styles.dimText}>RECALIBRATING</p>
                            <h3 className={styles.timerText}>{lockoutTimer}</h3>
                        </div>
                    </div>
                ) : (
                    <div className={styles.activeDisplay}>
                        <div className={styles.instructionLayer}>
                            <p className={styles.messageText}>
                                {message === 'INITIATE SIGNAL SCAN...' ? getInstructionMessage(attempts) : message}
                                {message === 'HIGHER' && <TrendingUp size={16} className={styles.hintIcon} />}
                                {message === 'LOWER' && <TrendingDown size={16} className={styles.hintIcon} />}
                            </p>
                        </div>
                        {attempts > 0 && message !== 'INITIATE SIGNAL SCAN...' && (
                            <div className={styles.subInstruction}>
                                <Target size={12} /> {getInstructionMessage(attempts)}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {!isLocked && (
                <div className={styles.inputGroup}>
                    <div className={styles.inputWrapper}>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={guess}
                            onChange={(e) => setGuess(e.target.value)}
                            placeholder="1-100"
                            className={styles.terminalInput}
                            autoFocus
                        />
                    </div>
                    <button onClick={handleGuess} className={styles.guessButton} disabled={loading}>
                        {loading ? "SCANNING..." : "INTERCEPT"}
                    </button>
                </div>
            )}
        </div>
    );
}
