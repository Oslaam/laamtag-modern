'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TOKEN_2022_PROGRAM_ID, getMint } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';

const SEEKER_MINT_AUTHORITY = new PublicKey("GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4");
const ADMIN_WALLET = "E4cHwRYWTznNjTvchSkZVXH8LWqdWbLekVXWjzmite6M";

export default function SeekerGuard({ children }: { children: React.ReactNode }) {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const verifyToken = async () => {
            if (!publicKey) return;
            if (publicKey.toBase58() === ADMIN_WALLET) {
                setHasAccess(true);
                return;
            }
            setLoading(true);
            try {
                const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                    publicKey,
                    { programId: TOKEN_2022_PROGRAM_ID }
                );

                let verified = false;
                for (const account of tokenAccounts.value) {
                    const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
                    if (amount > 0) {
                        const mintAddress = new PublicKey(account.account.data.parsed.info.mint);
                        const mintInfo = await getMint(connection, mintAddress, "confirmed", TOKEN_2022_PROGRAM_ID);
                        if (mintInfo.mintAuthority?.equals(SEEKER_MINT_AUTHORITY)) {
                            verified = true;
                            break;
                        }
                    }
                }
                setHasAccess(verified);
            } catch (err) {
                console.error("Verification Error:", err);
                setHasAccess(false);
            } finally {
                setLoading(false);
            }
        };
        verifyToken();
    }, [publicKey, connection]);

    // UI RENDERING - Removed min-h-screen so it fits INSIDE the GlobalLayout <main>
    if (!publicKey) {
        return (
            <div className="py-20 text-center">
                <div className="glass-card p-10 inline-block border-white/10">
                    <p className="text-yellow-500 font-bold text-lg">CONNECTION REQUIRED</p>
                    <p className="text-gray-400 text-sm mt-2">Initialize wallet to access this terminal.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="py-20 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-yellow-500 mx-auto mb-4"></div>
                <p className="text-yellow-500 font-mono text-[10px] tracking-[0.3em] animate-pulse">
                    VERIFYING GENESIS STANDING...
                </p>
            </div>
        );
    }

    if (hasAccess === false) {
        return (
            <div className="py-20 text-center px-4">
                <div className="max-w-md mx-auto p-10 bg-red-500/5 border border-red-500/20 rounded-[32px]">
                    <h2 className="text-2xl font-black italic text-red-500 uppercase mb-2">Access Denied</h2>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        This sector is restricted. Genesis Seeker credentials not found in this wallet.
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="mt-8 px-8 py-3 bg-white text-black text-[10px] font-black uppercase rounded-xl hover:bg-yellow-500 transition-colors"
                    >
                        Return to Surface
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}