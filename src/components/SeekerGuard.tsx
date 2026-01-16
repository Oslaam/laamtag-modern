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
import { Lock, ShieldAlert, ArrowLeft } from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// SGT Constants from Official Documentation
const SGT_MINT_AUTHORITY = 'GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4';
const SGT_METADATA_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';
const SGT_GROUP_MINT_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';

const ADMIN_WALLETS = [
    "E4cHwRYWTznNjTvchSkZVXH8LWqdWbLekVXWjzmite6M",
    "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc"
];

export default function SeekerGuard({ children }: { children: React.ReactNode }) {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!publicKey) {
            setHasAccess(null);
            return;
        }

        // 1. Check Admin first (instant)
        if (ADMIN_WALLETS.includes(publicKey.toBase58())) {
            setHasAccess(true);
            return;
        }

        // 2. Only run API if we haven't verified yet
        setLoading(true);
        fetch('/api/seekerguard/verify-sgt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: publicKey.toBase58() })
        })
            .then(res => res.json())
            .then(data => {
                console.log("SGT Verification:", data.hasAccess);
                setHasAccess(!!data.hasAccess);
            })
            .catch((err) => {
                console.error("Guard API Error:", err);
                setHasAccess(false);
            })
            .finally(() => setLoading(false));

    }, [publicKey]);

    // --- UI RENDER LOGIC ---
    if (!publicKey) {
        return (
            <div className="flex justify-center p-20">
                <div className="terminal-card max-w-md w-full text-center">
                    <Lock className="mx-auto mb-4 text-yellow-500" size={48} />
                    <h2 className="text-yellow-500 font-black uppercase tracking-widest mb-2">Connection Required</h2>
                    <p className="text-xs mb-6 opacity-60">INITIALIZE SEEKER MODULE TO ACCESS TERMINAL.</p>
                    <WalletMultiButton className="!bg-yellow-500 !text-black !font-bold !rounded-xl w-full" />
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center p-32">
                <div className="animate-spin w-10 h-10 border-4 border-yellow-500/10 border-t-yellow-500 rounded-full mb-4"></div>
                <p className="text-[10px] tracking-[0.3em] animate-pulse">DECRYPTING GENESIS STANDING...</p>
            </div>
        );
    }

    if (hasAccess === false) {
        return (
            <div className="flex justify-center p-20">
                <div className="terminal-card max-w-md w-full text-center border-red-500/20">
                    <ShieldAlert className="mx-auto mb-4 text-red-500" size={48} />
                    <h2 className="text-red-500 font-black uppercase tracking-widest mb-2">Access Denied</h2>
                    <p className="text-sm mb-6 opacity-70">GENESIS SEEKER CREDENTIALS NOT DETECTED.</p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"
                    >
                        <ArrowLeft size={14} /> Return to Surface
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}