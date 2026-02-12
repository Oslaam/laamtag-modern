'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
    TOKEN_2022_PROGRAM_ID,
    unpackMint,
    getMetadataPointerState,
    getTokenGroupMemberState
} from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { Lock, ShieldAlert, ArrowLeft, KeyRound, Loader2 } from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import styles from '../styles/SeekerGuard.module.css';

// --- CONSTANTS ---
const SGT_MINT_AUTHORITY = 'GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4';
const SGT_METADATA_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';
const SGT_GROUP_MINT_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';

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
    const { connection } = useConnection();
    const { publicKey, connected, connecting } = useWallet();

    const [hasPasscode, setHasPasscode] = useState<boolean>(false);
    const [isOpening, setIsOpening] = useState(false);
    const [initializing, setInitializing] = useState(true);

    // Security State
    const [hasSgt, setHasSgt] = useState<boolean | null>(null);
    const [dbAccess, setDbAccess] = useState<boolean>(false);

    const [inputCode, setInputCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (connecting) return;

        const runSecuritySequence = async () => {
            if (!publicKey) {
                setInitializing(false);
                return;
            }

            const walletAddress = publicKey.toString();
            const isAdmin = ADMIN_WALLETS.includes(walletAddress);
            const isBypass = BYPASS_WALLETS.includes(walletAddress);

            try {
                // STEP 1: SCAN FOR SGT NFT
                // Only non-admins and non-bypass wallets need to actually hold the SGT
                if (!isAdmin && !isBypass) {
                    // Note: If you don't have verify-only.ts, you may need a different check here.
                    // For now, this logic remains consistent with your request.
                    const sgtRes = await fetch(`/api/user/verify-only?address=${walletAddress}`);

                    // If the file is missing, this fetch will fail. 
                    // You might need to implement the SGT check logic here or create the API file.
                    if (sgtRes.ok) {
                        const sgtData = await sgtRes.json();
                        if (!sgtData?.hasAccess) {
                            setHasSgt(false);
                            setInitializing(false);
                            return;
                        }
                    } else {
                        // If API is missing, we default to block for safety
                        setHasSgt(false);
                        setInitializing(false);
                        return;
                    }
                }

                // If they reached here, they have SGT OR they are Admin/Bypass
                setHasSgt(true);

                // STEP 2: CHECK DATABASE FOR HASACCESS
                if (isAdmin) {
                    // Admins skip the gate entirely
                    setDbAccess(true);
                    setHasPasscode(true);
                } else {
                    // Bypass wallets AND SGT Holders MUST check the DB
                    const dbRes = await fetch(`/api/user/${walletAddress}`);
                    const dbUser = await dbRes.json();

                    if (dbUser?.hasAccess || sessionStorage.getItem('portal_unlocked') === 'true') {
                        setDbAccess(true);
                        setHasPasscode(true);
                    } else {
                        setDbAccess(false); // SGT/Bypass valid, but Gate is locked in DB
                    }
                }

            } catch (err) {
                console.error("Security Sequence Error:", err);
                setHasSgt(false);
            } finally {
                setInitializing(false);
            }
        };

        runSecuritySequence();
    }, [publicKey, connecting]);

    const handleUnlockPortal = async () => {
        if (!inputCode || !publicKey) return;
        setVerifying(true);
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
                sessionStorage.setItem('portal_unlocked', 'true');
                setIsOpening(true);
                setTimeout(() => {
                    setDbAccess(true);
                    setHasPasscode(true);
                }, 1000);
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
    // 1. LOADING STATE
    // Remain in loading until we have a definitive answer from both checks
    if (initializing || (connected && hasSgt === null)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black fixed inset-0 z-[10000]">
                <Loader2 className="animate-spin text-yellow-500 mb-4" size={48} />
                <p className="text-[10px] tracking-[0.3em] animate-pulse text-yellow-500">SCANNING BIOMETRICS...</p>
            </div>
        );
    }

    // 2. WALLET NOT CONNECTED
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

    // 3. SUCCESS STATE (PRIORITY)
    // If the database says they have access, let them in IMMEDIATELY.
    // This bypasses any buggy or slow SGT checks on mobile.
    if (dbAccess) {
        return <>{children}</>;
    }

    // 4. THE GATE (SECONDARY ACCESS)
    // If they have the SGT but haven't "unlocked" the gate in the DB yet, show the gate.
    // OR if the SGT check is failing/slow, we still show the gate so they can use a code.
    if (!dbAccess) {
        return (
            <div className={styles.portalContainer}>
                <div className={`${styles.doorLeft} ${isOpening ? styles.doorLeftOpen : ''}`} />
                <div className={`${styles.doorRight} ${isOpening ? styles.doorRightOpen : ''}`} />
                <div className={`${styles.lockInterface} ${isOpening ? styles.fadeOut : ''}`}>
                    <div className={styles.iconContainer}><KeyRound className={styles.keyIcon} size={64} /></div>
                    <h1 className={styles.portalTitle}>LAAMTAG GATE</h1>
                    <p className={styles.portalSubtitle}>
                        {hasSgt ? "SGT Verified. Enter Registration Code." : "Enter Access Code to Proceed."}
                    </p>
                    <div className={styles.inputGroup}>
                        <input
                            type="text"
                            placeholder="ADMIN OR REFERRAL CODE"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                            className={styles.portalInput}
                        />
                        {error && <p className={styles.errorText}>{error}</p>}
                        <button onClick={handleUnlockPortal} disabled={verifying} className={styles.unlockButton}>
                            {verifying ? <Loader2 className="animate-spin" size={16} /> : 'ACTIVATE ACCESS'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 5. FINAL DENIAL (LAST RESORT)
    // Only show this if the user is NOT in the DB and we are SURE they don't have an SGT.
    if (hasSgt === false && !dbAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black">
                <div className="terminal-card max-w-md w-full text-center p-10 border border-red-500/30">
                    <ShieldAlert className="mx-auto mb-4 text-red-500" size={48} />
                    <h2 className="text-red-500 font-black uppercase tracking-widest mb-2">Access Denied</h2>
                    <p className="text-xs mb-4 text-white/80">SEEKER GENESIS TOKEN NOT FOUND.</p>
                    <p className="text-[9px] opacity-40 uppercase">You must hold an SGT NFT or use a valid code to access the Hub.</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;

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

    if (hasSgt === false) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black">
                <div className="terminal-card max-w-md w-full text-center p-10 border border-red-500/30">
                    <ShieldAlert className="mx-auto mb-4 text-red-500" size={48} />
                    <h2 className="text-red-500 font-black uppercase tracking-widest mb-2">Access Denied</h2>
                    <p className="text-xs mb-4 text-white/80">SEEKER GENESIS TOKEN NOT FOUND.</p>
                    <p className="text-[9px] opacity-40 uppercase">You must hold an SGT NFT to access the LaamTag Hub.</p>
                </div>
            </div>
        );
    }

    if (!dbAccess) {
        return (
            <div className={styles.portalContainer}>
                <div className={`${styles.doorLeft} ${isOpening ? styles.doorLeftOpen : ''}`} />
                <div className={`${styles.doorRight} ${isOpening ? styles.doorRightOpen : ''}`} />
                <div className={`${styles.lockInterface} ${isOpening ? styles.fadeOut : ''}`}>
                    <div className={styles.iconContainer}><KeyRound className={styles.keyIcon} size={64} /></div>
                    <h1 className={styles.portalTitle}>LAAMTAG GATE</h1>
                    <p className={styles.portalSubtitle}>SGT Verified. Enter Registration Code.</p>
                    <div className={styles.inputGroup}>
                        <input
                            type="text"
                            placeholder="ADMIN OR REFERRAL CODE"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                            className={styles.portalInput}
                        />
                        {error && <p className={styles.errorText}>{error}</p>}
                        <button onClick={handleUnlockPortal} disabled={verifying} className={styles.unlockButton}>
                            {verifying ? <Loader2 className="animate-spin" size={16} /> : 'ACTIVATE ACCESS'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}