'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TOKEN_2022_PROGRAM_ID, getMint } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { Lock, ShieldAlert, ArrowLeft } from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// The Seeker Genesis Mint Authority
const SEEKER_MINT_AUTHORITY = new PublicKey("GT2zuHVaZQYZSyQMgJPLzvkmyztfyXg2NJunqFp4p3A4");

// Authorized Admin Wallets
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
        const verifyToken = async () => {
            if (!publicKey) {
                setHasAccess(null);
                return;
            }

            // 1. IMMEDIATE ADMIN CHECK
            const walletAddr = publicKey.toBase58();
            if (ADMIN_WALLETS.includes(walletAddr)) {
                console.log("Terminal Access: Admin Verified");
                setHasAccess(true);
                return;
            }

            setLoading(true);
            try {
                // 2. FETCH TOKEN-2022 ACCOUNTS
                const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                    publicKey,
                    { programId: TOKEN_2022_PROGRAM_ID }
                );

                let verified = false;

                // 3. OPTIMIZED SEARCH: Only check accounts with balance > 0
                const activeAccounts = tokenAccounts.value.filter(
                    acc => acc.account.data.parsed.info.tokenAmount.uiAmount > 0
                );

                console.log(`Scanning ${activeAccounts.length} active Token-2022 assets...`);

                for (const account of activeAccounts) {
                    try {
                        const mintAddress = new PublicKey(account.account.data.parsed.info.mint);
                        const mintInfo = await getMint(connection, mintAddress, "confirmed", TOKEN_2022_PROGRAM_ID);

                        // Check if the mint authority matches Seeker Genesis
                        if (mintInfo.mintAuthority?.equals(SEEKER_MINT_AUTHORITY)) {
                            verified = true;
                            break;
                        }
                    } catch (e) {
                        // Skip individual mint failures (e.g. RPC timeout on one specific token)
                        continue;
                    }
                }

                console.log("Verification Result:", verified ? "ACCESS GRANTED" : "ACCESS DENIED");
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

    // 1. STATE: WALLET NOT CONNECTED
    if (!publicKey) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 20px' }}>
                <div className="terminal-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ padding: '15px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '20px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                            <Lock size={32} color="#eab308" />
                        </div>
                    </div>
                    <h2 style={{ color: '#eab308', fontWeight: 900, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 10px 0' }}>
                        Connection Required
                    </h2>
                    <p className="terminal-desc" style={{ marginBottom: '25px', fontSize: '10px' }}>
                        INITIALIZE SEEKER MODULE TO ACCESS SECURE HUB TERMINALS.
                    </p>
                    <div className="flex justify-center">
                        <WalletMultiButton className="terminal-button" style={{ width: '100%', background: '#eab308', color: '#000', fontWeight: 900, borderRadius: '12px' }} />
                    </div>
                </div>
            </div>
        );
    }

    // 2. STATE: VERIFYING ON-CHAIN DATA
    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '100px 20px' }}>
                <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(234, 179, 8, 0.1)', borderTopColor: '#eab308', borderRadius: '50%', marginBottom: '20px' }}></div>
                <p className="terminal-desc animate-pulse" style={{ letterSpacing: '4px', fontSize: '9px' }}>
                    DECRYPTING GENESIS STANDING...
                </p>
            </div>
        );
    }

    // 3. STATE: TOKEN NOT FOUND (ACCESS DENIED)
    if (hasAccess === false) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 20px' }}>
                <div className="terminal-card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ padding: '15px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <ShieldAlert size={32} color="#ef4444" />
                        </div>
                    </div>
                    <h2 style={{ color: '#ef4444', fontWeight: 900, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 10px 0' }}>
                        Access Denied
                    </h2>
                    <p className="terminal-desc" style={{ marginBottom: '25px', fontSize: '11px', lineHeight: '1.6' }}>
                        RESTRICTED SECTOR. GENESIS SEEKER CREDENTIALS NOT DETECTED IN THE CONNECTED MODULE.
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <ArrowLeft size={14} /> Return to Surface
                    </button>
                </div>
            </div>
        );
    }

    // 4. STATE: ACCESS GRANTED
    return <>{children}</>;
}