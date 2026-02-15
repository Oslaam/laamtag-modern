'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useState, useCallback } from 'react';
import { Lock, ShieldAlert, KeyRound, Loader2, RefreshCcw } from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import styles from '../styles/SeekerGuard.module.css';

// --- AUTHORIZED WALLETS ---
const ADMIN_WALLETS = [
    "E4cHwRYWTznNjTvchSkZVXH8LWqdWbLekVXWjzmite6M",
    "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc"
];

const BYPASS_WALLETS = [
    "43ARBKVdGKR2a1t7gh3oAu4ZjbnRZaTvM9YDp5twzgvn",
    "kzHT1obsuYCCWUChsvtUADxEw6VqNF3F9kywWEXDkKG",
    "6RAqkR7HQmuCcgQ9BX1MUMi9papZYLExFYfrcFCpW2fo"
];

export default function SeekerGuard({ children }: { children: React.ReactNode }) {
    const { publicKey, connected, connecting } = useWallet();

    const [isOpening, setIsOpening] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [rpcError, setRpcError] = useState(false);

    // Security State
    const [hasSgt, setHasSgt] = useState<boolean | null>(null);
    const [dbAccess, setDbAccess] = useState<boolean>(false);

    const [inputCode, setInputCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');

    const runSecuritySequence = useCallback(async () => {
        if (!publicKey) {
            setInitializing(false);
            return;
        }

        setInitializing(true);
        setRpcError(false);
        const walletAddress = publicKey.toString();

        try {
            // STEP 1: Check Database First
            const dbRes = await fetch(`/api/user/${walletAddress}`);
            const dbUser = await dbRes.json();

            // Immediate entry for special wallets or previously verified users
            if (ADMIN_WALLETS.includes(walletAddress) || BYPASS_WALLETS.includes(walletAddress) || dbUser?.hasAccess) {
                setDbAccess(true);
                setHasSgt(true);
                setInitializing(false);
                return;
            }

            // STEP 2: Check SGT Mint Ownership via API (Helius/RPC check)
            const sgtRes = await fetch(`/api/user/verify-only?address=${walletAddress}`);

            if (!sgtRes.ok) throw new Error("NETWORK_FAILURE");

            const sgtData = await sgtRes.json();

            // If hasAccess is false here, they are hard-blocked from the keypad
            setHasSgt(sgtData?.hasAccess === true);

        } catch (err) {
            console.error("Security Sequence Error:", err);
            setRpcError(true); // Shows Retry UI instead of Access Denied for network errors
        } finally {
            setInitializing(false);
        }
    }, [publicKey]);

    useEffect(() => {
        if (!connecting) runSecuritySequence();
    }, [publicKey, connecting, runSecuritySequence]);

    const handleUnlockPortal = async () => {
        if (!inputCode || !publicKey || verifying) return;

        setVerifying(true);
        setError('');

        try {
            const res = await fetch('/api/access/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: inputCode,
                    walletAddress: publicKey.toBase58()
                })
            });
            const data = await res.json();

            if (data.success) {
                setIsOpening(true);
                setTimeout(() => {
                    setDbAccess(true);
                }, 1200);
            } else {
                setError(data.message || "INVALID ACCESS CODE");
            }
        } catch (err) {
            setError("SYSTEM ERROR");
        } finally {
            setVerifying(false);
        }
    };

    // --- RENDER LOGIC ---

    // 1. SCANNING STATE
    if (initializing || (connected && hasSgt === null && !rpcError)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black fixed inset-0 z-[10000]">
                <Loader2 className="animate-spin text-yellow-500 mb-4" size={48} />
                <p className="text-[10px] tracking-[0.3em] animate-pulse text-yellow-500">SCANNING BIOMETRICS...</p>
            </div>
        );
    }

    // 2. RPC / NETWORK FAILURE (Prevents legitimate users from being "Denied" by mistake)
    if (rpcError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black">
                <div className="terminal-card max-w-md w-full text-center p-10 border border-yellow-500/20">
                    <RefreshCcw className="mx-auto mb-4 text-yellow-500" size={48} />
                    <h2 className="text-yellow-500 font-black uppercase tracking-widest mb-2">Sync Error</h2>
                    <p className="text-xs mb-6 opacity-60">FAILED TO CONNECT TO SOLANA NETWORK.</p>
                    <button
                        onClick={runSecuritySequence}
                        className="bg-yellow-500 text-black px-6 py-2 rounded font-bold text-[10px]"
                    >
                        RETRY SCAN
                    </button>
                </div>
            </div>
        );
    }

    // 3. WALLET NOT CONNECTED
    if (!publicKey) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black">
                <div className="terminal-card max-w-md w-full text-center p-10 border border-yellow-500/20">
                    <Lock className="mx-auto mb-4 text-yellow-500" size={48} />
                    <h2 className="text-yellow-500 font-black uppercase tracking-widest mb-2">System Offline</h2>
                    <p className="text-xs mb-6 opacity-60">IDENTIFY YOUR WALLET TO PROCEED.</p>
                    <div className="flex justify-center">
                        <WalletMultiButton className="!bg-yellow-500 !text-black" />
                    </div>
                </div>
            </div>
        );
    }

    // 4. ACCESS GRANTED
    if (dbAccess) {
        return <>{children}</>;
    }

    // 5. ACCESS DENIED (SGT Check definitely failed)
    if (hasSgt === false) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black">
                <div className="terminal-card max-w-md w-full text-center p-10 border border-red-500/30">
                    <ShieldAlert className="mx-auto mb-4 text-red-500" size={48} />
                    <h2 className="text-red-500 font-black uppercase tracking-widest mb-2">Access Denied</h2>
                    <p className="text-xs mb-4 text-white/80">SEEKER GENESIS TOKEN NOT FOUND.</p>
                    <p className="text-[9px] opacity-40 uppercase tracking-tighter">A GENESIS TOKEN IS REQUIRED FOR THIS TERMINAL.</p>
                </div>
            </div>
        );
    }

    // 6. THE GATE (Only SGT holders who aren't in DB yet reach this)
    return (
        <div className={styles.portalContainer}>
            <div className={`${styles.doorLeft} ${isOpening ? styles.doorLeftOpen : ''}`} />
            <div className={`${styles.doorRight} ${isOpening ? styles.doorRightOpen : ''}`} />
            <div className={`${styles.lockInterface} ${isOpening ? styles.fadeOut : ''}`}>
                <div className={styles.iconContainer}><KeyRound className={styles.keyIcon} size={64} /></div>
                <h1 className={styles.portalTitle}>LAAMTAG GATE</h1>
                <p className={styles.portalSubtitle}>SGT Verified. Enter Activation Code.</p>
                <div className={styles.inputGroup}>
                    <input
                        type="text"
                        placeholder="ENTER CODE"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                        className={styles.portalInput}
                    />
                    {error && <p className={styles.errorText}>{error}</p>}
                    <button
                        onClick={handleUnlockPortal}
                        disabled={verifying || !inputCode}
                        className={`${styles.unlockButton} ${verifying ? styles.buttonDisabled : ''}`}
                    >
                        {verifying ? 'VERIFYING...' : 'ACTIVATE ACCESS'}
                    </button>
                </div>
            </div>
        </div>
    );
}