import { useState, useEffect } from 'react';
import { Timer, Users, ArrowRight, Loader2, Plus, Trophy, Medal, Award, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Eye } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import RaffleRefundSection from './RaffleRefundSection';
import RaffleHistory from './RaffleHistory';

// Umi & Metaplex Imports
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";

import {
    mplToolbox,
    transferTokens,
    findAssociatedTokenPda,
    setComputeUnitPrice
} from "@metaplex-foundation/mpl-toolbox";

const SKR_MINT = new PublicKey("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");
const TREASURY = new PublicKey("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc");
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

// --- Types & Props ---
interface RaffleLobbyProps {
    user?: any;
    mutate?: any;
    onInviteRequested?: (poolId: string) => void;
}

function useCountdown(targetDate: string | Date) {
    const [timeLeft, setTimeLeft] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const target = new Date(targetDate).getTime();
            setTimeLeft(Math.max(0, target - now));
        }, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);
    return { hours, minutes, seconds, expired: timeLeft <= 0 };
}

const RaffleCard = ({
    pool,
    onJoin,
    onInviteClick,
    loading,
    userWallet,
    isArchived = false
}: {
    pool: any,
    onJoin: (id: string, fee: number) => void,
    onInviteClick: (id: string) => void,
    loading: boolean,
    userWallet: string | null,
    isArchived?: boolean
}) => {
    const { hours, minutes, seconds, expired } = useCountdown(pool.expiresAt);
    const participantCount = pool.entries?.length || 0;
    const hasJoined = pool.entries?.some((e: any) => e.walletAddress === userWallet);
    const isLocked = pool.status === 'LOCKED';
    const isRefunded = pool.status === 'EXPIRED';

    const getStatusColor = () => {
        if (isLocked) return '#22c55e';
        if (isRefunded || expired) return '#ef4444';
        return '#eab308';
    };

    const accentColor = getStatusColor();

    return (
        <div className="terminal-card" style={{
            padding: '20px',
            border: `1px solid ${accentColor}44`,
            background: 'rgba(0,0,0,0.4)',
            transition: 'all 0.3s ease',
            position: 'relative'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span style={{ color: accentColor, fontWeight: 900, fontSize: '12px', letterSpacing: '1px' }}>
                    {pool.entryFee} $SKR POOL
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: accentColor, fontSize: '10px', fontWeight: 900 }}>
                    {isLocked ? (
                        <><CheckCircle2 size={12} /> COMPLETED</>
                    ) : isRefunded ? (
                        <><AlertCircle size={12} /> REFUNDED</>
                    ) : (
                        <><Timer size={12} /> {expired ? 'EXPIRED' : `${hours}h ${minutes}m ${seconds}s`}</>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {[...Array(5)].map((_, i) => (
                    <div key={i} style={{
                        height: '6px', flex: 1,
                        background: i < participantCount ? accentColor : 'rgba(255,255,255,0.1)',
                        boxShadow: i < participantCount ? `0 0 10px ${accentColor}66` : 'none',
                        borderRadius: '2px'
                    }} />
                ))}
            </div>

            {isLocked && pool.entries && (
                <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px' }}>
                    <p style={{ fontSize: '10px', color: '#22c55e', fontWeight: 900, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Trophy size={14} /> DRAW RESULTS
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                            { status: 'WINNER_1ST', icon: <Medal size={12} color="#eab308" />, label: '1ST' },
                            { status: 'WINNER_2ND', icon: <Award size={12} color="#94a3b8" />, label: '2ND' },
                            { status: 'WINNER_3RD', icon: <Award size={12} color="#b45309" />, label: '3RD' },
                            { status: 'CHALLENGER_4TH', icon: <Award size={12} color="#d90f0f" />, label: '4TH' },
                            { status: 'CHALLENGER_5TH', icon: <Award size={12} color="#d90f0f" />, label: '5TH' }
                        ].map((rank, i) => {
                            const entry = pool.entries.find((e: any) => e.status === rank.status);
                            return (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff' }}>
                                        {rank.icon}
                                        <span style={{ fontWeight: 800 }}>{rank.label}</span>
                                    </div>
                                    <span style={{ fontFamily: 'monospace' }}>
                                        {entry ? `${entry.walletAddress.slice(0, 4)}...${entry.walletAddress.slice(-4)}` : '---'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {isRefunded && (
                <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px' }}>
                    <p style={{ fontSize: '10px', color: '#ef4444', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
                        <AlertCircle size={14} /> REFUNDED: POOL DID NOT FILL
                    </p>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>
                    <Users size={10} style={{ display: 'inline', marginRight: '4px' }} />
                    {participantCount}/5 SECURED
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => onInviteClick(pool.id)}
                        style={{
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)',
                            cursor: 'pointer'
                        }}
                        title="Invite Friends"
                    >
                        <Plus size={14} color="#eab308" />
                    </button>

                    <button
                        onClick={() => onJoin(pool.id, pool.entryFee)}
                        disabled={expired || participantCount >= 5 || loading || hasJoined || isRefunded}
                        className="terminal-button"
                        style={{
                            padding: '8px 16px',
                            fontSize: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            borderColor: hasJoined ? '#22c55e' : (isRefunded ? '#ef4444' : accentColor),
                            color: hasJoined ? '#22c55e' : (isRefunded ? '#ef4444' : accentColor),
                            opacity: (isLocked || isRefunded) ? 0.7 : 1,
                            background: 'transparent'
                        }}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={12} />
                        ) : hasJoined ? (
                            'JOINED'
                        ) : isRefunded ? (
                            'REFUNDED'
                        ) : (participantCount >= 5 || isLocked) ? (
                            'LOCKED'
                        ) : (
                            'ENTER'
                        )}
                        <ArrowRight size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function RaffleLobby({ user, mutate, onInviteRequested }: RaffleLobbyProps) {
    const { connection } = useConnection();
    const { publicKey, wallet } = useWallet();
    const [pools, setPools] = useState<any[]>([]);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [showArchive, setShowArchive] = useState(false);
    const [liveUsers, setLiveUsers] = useState(Math.floor(Math.random() * 15) + 5);

    const fetchPools = async () => {
        try {
            const res = await axios.get('/api/games/raffle/get-pools');
            setPools(res.data.pools || []);
            setLiveUsers(prev => Math.max(3, prev + (Math.random() > 0.5 ? 1 : -1)));
        } catch (e) { console.error("Pool Fetch Error", e); }
    };

    useEffect(() => {
        fetchPools();
        const int = setInterval(fetchPools, 10000);
        return () => clearInterval(int);
    }, []);

    // --- AUTO-SCROLL LOGIC ---
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const targetPoolId = params.get('poolId');

        if (targetPoolId && pools.length > 0) {
            // Delay slightly to allow the DOM to render the list
            const timer = setTimeout(() => {
                const element = document.getElementById(`pool-${targetPoolId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Optional: Add a brief highlight effect
                    element.style.outline = "2px solid #eab308";
                    element.style.borderRadius = "8px";
                    setTimeout(() => {
                        if (element) element.style.outline = "none";
                    }, 3000);
                }
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [pools]);

    const activePools = pools.filter(p =>
        p.status === 'OPEN' && new Date(p.expiresAt).getTime() > Date.now()
    );

    const canCreatePool = activePools.length < 2;

    const finishedPools = pools.filter(p =>
        p.status === 'LOCKED' ||
        p.status === 'EXPIRED' ||
        (p.status === 'OPEN' && new Date(p.expiresAt).getTime() <= Date.now())
    );

    const latestFinished = finishedPools[0];
    const archivedPools = finishedPools.slice(1);

    const createNewPool = async () => {
        if (!canCreatePool) {
            toast.error("PROTOCOL LIMIT: JOIN EXISTING POOLS FIRST");
            return;
        }
        setIsActionLoading(true);
        try {
            await axios.post('/api/games/raffle/create-pool');
            toast.success("NEW POOL INITIALIZED");
            fetchPools();
        } catch (e) { toast.error("Failed to create pool"); }
        finally { setIsActionLoading(false); }
    };

    const handleInvite = async (poolId: string) => {
        if (!publicKey) return toast.error("CONNECT WALLET TO INVITE FRIENDS");

        const toastId = toast.loading("BROADCASTING TO ALL FRIENDS...");

        try {
            const res = await axios.post('/api/games/raffle/invite', {
                poolId,
                senderAddress: publicKey.toBase58()
            });

            toast.success(`SIGNAL SENT: ${res.data.count} FRIENDS NOTIFIED`, {
                id: toastId,
                duration: 5000
            });
        } catch (e: any) {
            const msg = e.response?.data?.error || "FAILED TO SEND INVITES";
            toast.error(msg, { id: toastId });
        }
    };

    const handleJoin = async (poolId: string, fee: number) => {
        if (!publicKey || !wallet || !wallet.adapter.connected) {
            return toast.error("Please connect your wallet first!");
        }

        setIsActionLoading(true);

        try {
            const umi = createUmi(RPC_URL)
                .use(walletAdapterIdentity(wallet.adapter as any))
                .use(mplToolbox());

            const SKR_MINT_UMI = umiPublicKey("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");
            const TREASURY_WALLET_UMI = umiPublicKey("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc");
            const userWalletUmi = umiPublicKey(publicKey.toBase58());

            const sourceAccount = findAssociatedTokenPda(umi, {
                mint: SKR_MINT_UMI,
                owner: userWalletUmi,
            })[0];

            const destinationAccount = findAssociatedTokenPda(umi, {
                mint: SKR_MINT_UMI,
                owner: TREASURY_WALLET_UMI,
            })[0];

            const atomicAmount = BigInt(Math.floor(fee * 1_000_000));

            const result = await setComputeUnitPrice(umi, { microLamports: 50000 })
                .add(transferTokens(umi, {
                    source: sourceAccount,
                    destination: destinationAccount,
                    authority: umi.identity,
                    amount: atomicAmount,
                }))
                .sendAndConfirm(umi);

            const signature = base58.deserialize(result.signature)[0];

            await axios.post('/api/games/raffle/join', {
                poolId,
                walletAddress: publicKey.toBase58(),
                signature
            });

            toast.success("ENTRY SECURED");
            fetchPools();
        } catch (err: any) {
            console.error("Umi Raffle Error:", err);
            const errorMsg = err.message || "Transaction failed";
            toast.error(errorMsg.includes("Simulation failed")
                ? "Check your $SKR balance or network"
                : errorMsg
            );
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '9px',
                    color: '#22c55e',
                    background: 'rgba(34, 197, 94, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontWeight: 900,
                    letterSpacing: '1px'
                }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                    <Eye size={10} /> {liveUsers} OPERATORS ONLINE
                </div>
            </div>

            {publicKey && <RaffleRefundSection walletAddress={publicKey.toBase58()} />}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                <div>
                    <h3 style={{ color: '#eab308', margin: 0, fontSize: '14px', fontWeight: 900 }}>MATRIX SPRINT LOBBY</h3>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                        {activePools.length} POOL(S) ACTIVE
                    </p>
                </div>
                <button
                    onClick={createNewPool}
                    disabled={isActionLoading || !canCreatePool}
                    className="terminal-button"
                    style={{
                        background: canCreatePool ? '#eab308' : 'rgba(255,255,255,0.05)',
                        color: canCreatePool ? 'black' : 'rgba(255,255,255,0.2)',
                        padding: '10px 20px',
                        cursor: canCreatePool ? 'pointer' : 'not-allowed',
                        border: canCreatePool ? 'none' : '1px solid rgba(255,255,255,0.1)'
                    }}
                >
                    {isActionLoading ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} style={{ marginRight: '5px' }} />}
                    {canCreatePool ? 'START NEW POOL' : 'POOL LIMIT REACHED'}
                </button>
            </div>

            <div className="terminal-card" style={{ marginBottom: '20px', borderLeft: '4px solid #eab308', background: 'rgba(234, 179, 8, 0.05)' }}>
                <h4 style={{ color: '#eab308', fontSize: '12px', marginBottom: '10px', fontWeight: 900 }}>SYSTEM PROTOCOL: MATRIX SPRINT</h4>
                <ul style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', lineHeight: '1.6', listStyle: 'none', padding: 0 }}>
                    <li>• <strong>Objective:</strong> Each pool requires 5 participants to trigger the draw.</li>
                    <li>• <strong>Prize Pool:</strong> 1st: <span style={{ color: '#22c55e' }}>1,000 SKR</span> | 2nd: 700 SKR | 3rd: 600 SKR</li>
                    <li>• <strong>Challenger Rewards:</strong> 4th & 5th place receive 10,000 LaamPoints + 200 TAG Tickets.</li>
                    <li>• <strong>Refunds:</strong> If a pool doesn't fill within 6 hours, you can claim your SKR back.</li>
                </ul>
            </div>

            {activePools.map((pool: any) => (
                <div key={pool.id} id={`pool-${pool.id}`}>
                    <RaffleCard
                        pool={pool}
                        onJoin={handleJoin}
                        onInviteClick={handleInvite}
                        loading={isActionLoading}
                        userWallet={publicKey?.toBase58() || null}
                    />
                </div>
            ))}

            {latestFinished && (
                <div style={{ marginTop: '10px' }} id={`pool-${latestFinished.id}`}>
                    <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: 900, marginBottom: '8px', letterSpacing: '1px' }}>
                        LATEST RESULT
                    </p>
                    <RaffleCard
                        pool={latestFinished}
                        onJoin={handleJoin}
                        onInviteClick={handleInvite}
                        loading={isActionLoading}
                        userWallet={publicKey?.toBase58() || null}
                    />
                </div>
            )}

            {archivedPools.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                    <button
                        onClick={() => setShowArchive(!showArchive)}
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            color: 'rgba(255,255,255,0.4)',
                            fontSize: '10px',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {showArchive ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {showArchive ? 'HIDE HISTORY' : `SHOW PREVIOUS (${archivedPools.length})`}
                    </button>

                    {showArchive && archivedPools.map((pool: any) => (
                        <div key={pool.id} id={`pool-${pool.id}`} style={{ width: '100%' }}>
                            <RaffleCard
                                pool={pool}
                                onJoin={handleJoin}
                                onInviteClick={handleInvite}
                                loading={isActionLoading}
                                userWallet={publicKey?.toBase58() || null}
                                isArchived={true}
                            />
                        </div>
                    ))}
                </div>
            )}

            {publicKey && <RaffleHistory walletAddress={publicKey.toBase58()} />}
        </div>
    );
}