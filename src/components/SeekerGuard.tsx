'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TOKEN_2022_PROGRAM_ID, getMint } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';

const SEEKER_MINT_AUTHORITY = new PublicKey("GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4");

const ADMIN_WALLET = "kzHT1obsuYCCWUChsvtUADxEw6VqNF3F9kywWEXDkKG";

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
                // Fetch all Token-2022 accounts owned by the user
                const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                    publicKey,
                    { programId: TOKEN_2022_PROGRAM_ID }
                );

                let verified = false;

                for (const account of tokenAccounts.value) {
                    const amount = account.account.data.parsed.info.tokenAmount.uiAmount;

                    // Only check the mint if the user actually owns the token (amount > 0)
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
                // If it fails, we default to false to keep it gated
                setHasAccess(false);
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
    }, [publicKey, connection]);

    // UI RENDERING
    if (!publicKey) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <div className="text-center p-10 bg-gray-900 rounded-3xl border border-white/10">
                    <p className="text-yellow-500 font-bold">Wallet Disconnected</p>
                    <p className="text-gray-400">Please connect your wallet to access this portal.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-yellow-500 mx-auto mb-4"></div>
                    <p className="text-yellow-500 font-mono">SCANNING FOR SEEKER GENESIS...</p>
                </div>
            </div>
        );
    }

    if (hasAccess === false) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <div className="max-w-md text-center p-10 bg-red-500/10 border border-red-500/50 rounded-3xl">
                    <h2 className="text-3xl font-black italic text-red-500 uppercase mb-4">Access Denied</h2>
                    <p className="text-gray-300">
                        This terminal is restricted. Only <span className="text-white font-bold">Seeker Genesis Token</span> holders can proceed.
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="mt-8 px-6 py-2 bg-red-500 text-white font-bold rounded-xl"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}