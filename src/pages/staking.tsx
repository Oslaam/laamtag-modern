import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { publicKey as umiPublicKey, createAmount } from '@metaplex-foundation/umi';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import SeekerGuard from '../components/SeekerGuard';
import axios from 'axios';
import { Lock, Zap, Clock, History, TrendingUp, Layers, X, Calendar, Wallet } from 'lucide-react';
import { stakeNftOnChain } from '../lib/stakeNftTask';
import { unstakeNftOnChain } from '../lib/unstakeNftTask';
import { Transaction, PublicKey } from '@solana/web3.js';
import {
    mplToolbox,
    findAssociatedTokenPda,
    createIdempotentAssociatedToken,
    transferTokens
} from '@metaplex-foundation/mpl-toolbox';
import { transactionBuilder } from '@metaplex-foundation/umi';
import bs58 from 'bs58';

// --- SUB-COMPONENT: REWARD TICKER ---
const RewardTicker = ({
    stakedAt,
    lastClaimed,
    multiplier = 1,
    upcomingMultiplier = 0 // New prop to show pending boosts
}: {
    stakedAt: string;
    lastClaimed: string;
    multiplier?: number;
    upcomingMultiplier?: number;
}) => {
    const [rewards, setRewards] = useState({ laam: 0, tag: 0 });
    const [timeLeft, setTimeLeft] = useState<string | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const start = new Date(stakedAt).getTime();
            const last = new Date(lastClaimed).getTime();

            const lockDuration = 48 * 3600 * 1000;
            const elapsedSinceStake = now - start;

            if (elapsedSinceStake < lockDuration) {
                const remaining = lockDuration - elapsedSinceStake;
                const hours = Math.floor(remaining / (3600 * 1000));
                const mins = Math.floor((remaining % (3600 * 1000)) / (60 * 1000));
                setTimeLeft(`LOCKED: ${hours}h ${mins}m left`);
                setRewards({ laam: 0, tag: 0 });
            } else {
                setTimeLeft(null);
                const secondsSinceLastClaim = Math.floor((now - last) / 1000);
                const validSeconds = Math.max(0, secondsSinceLastClaim);

                setRewards({
                    laam: validSeconds * (500 / 86400) * multiplier,
                    tag: validSeconds * (20 / 86400) * multiplier
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [stakedAt, lastClaimed, multiplier]);

    return (
        <div style={{ marginTop: '12px' }}>
            {timeLeft ? (
                <div style={{ background: 'rgba(255, 68, 68, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255, 68, 68, 0.2)' }}>
                    <p style={{ color: '#ff4444', fontSize: '10px', fontWeight: 900, margin: 0, textAlign: 'center' }}>
                        <Clock size={10} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {timeLeft}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '12px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                        <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: 900 }}>
                            LAAM ACCRUED {multiplier > 1 && <span style={{ color: '#a855f7' }}>(x{multiplier})</span>}
                        </p>
                        <p style={{ color: '#eab308', fontWeight: 900, fontSize: '14px', margin: 0, fontFamily: 'monospace' }}>
                            {rewards.laam.toFixed(4)}
                        </p>
                        {/* Visual indicator for bought boost that is not yet active */}
                        {upcomingMultiplier > 0 && (
                            <p style={{ fontSize: '7px', color: '#eab308', margin: '4px 0 0 0', fontWeight: 900, textTransform: 'uppercase' }}>
                                ● Next Cycle: x{upcomingMultiplier}
                            </p>
                        )}
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: 900 }}>TAG ACCRUED</p>
                        <p style={{ color: '#fff', fontWeight: 900, fontSize: '14px', margin: 0, fontFamily: 'monospace' }}>
                            {rewards.tag.toFixed(4)}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- CLAIM BUTTON ---
const ClaimButton = ({ lastClaimed, onClaim, loading, stakedAt }: any) => {
    const [cooldown, setCooldown] = useState<string | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();
            const stakeTime = new Date(stakedAt).getTime();
            const lastClaimTime = lastClaimed ? new Date(lastClaimed).getTime() : stakeTime;

            const lock48h = 48 * 3600 * 1000;
            const cooldown24h = 24 * 3600 * 1000;

            if (now - stakeTime < lock48h) {
                const remaining = lock48h - (now - stakeTime);
                const h = Math.floor(remaining / (3600 * 1000));
                const m = Math.floor((remaining % (3600 * 1000)) / (60 * 1000));
                setCooldown(`VAULT LOCK: ${h}h ${m}m`);
            } else if (now - lastClaimTime < cooldown24h) {
                const remaining = cooldown24h - (now - lastClaimTime);
                const h = Math.floor(remaining / (3600 * 1000));
                const m = Math.floor((remaining % (3600 * 1000)) / (60 * 1000));
                setCooldown(`NEXT CLAIM: ${h}h ${m}m`);
            } else {
                setCooldown(null);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [lastClaimed, stakedAt]);

    return (
        <button
            disabled={loading || !!cooldown}
            onClick={onClaim}
            className="secondary-btn"
            style={{
                padding: '10px',
                fontSize: '11px',
                background: cooldown ? '#1a1a1a' : '#a855f7',
                color: cooldown ? '#666' : '#fff',
                border: cooldown ? '1px solid #333' : 'none',
                borderRadius: '4px',
                cursor: cooldown ? 'not-allowed' : 'pointer',
                fontWeight: 900,
                width: '100%'
            }}
        >
            {loading ? 'PROCESSING...' : cooldown ? cooldown : 'CLAIM ACCRUED REWARDS'}
        </button>
    );
};

// --- MODAL COUNTDOWN SUB-COMPONENT ---
const BoostCountdown = ({ expiresAt }: { expiresAt: string }) => {
    const [timeStr, setTimeStr] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            const diff = new Date(expiresAt).getTime() - Date.now();
            if (diff <= 0) {
                setTimeStr("EXPIRING...");
                return;
            }
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeStr(`${d}d ${h}h ${m}m ${s}s`);
        }, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    return <span style={{ color: '#a855f7', fontWeight: 900 }}>{timeStr}</span>;
};

export default function VaultPage() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const { publicKey, signMessage } = wallet;

    const SKR_TOKEN_MINT = process.env.NEXT_PUBLIC_SKR_TOKEN_MINT || "";
    const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || "";


    const [nfts, setNfts] = useState<any[]>([]);
    const [rawStakes, setRawStakes] = useState<any[]>([]);
    const [allBoosts, setAllBoosts] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [totalClaimed, setTotalClaimed] = useState({ laam: 0, tag: 0 });
    const [skrBalance, setSkrBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const [selectedNftForSchedule, setSelectedNftForSchedule] = useState<any | null>(null);

    const boostOptions = [
        { mult: 2, price: 500 },
        { mult: 3, price: 800 },
        { mult: 5, price: 1400 },
        { mult: 10, price: 3000 },
        { mult: 50, price: 18000 },
        { mult: 100, price: 40000 }
    ];

    const loadData = async () => {
        if (!publicKey || !signMessage) return;
        try {
            const message = `Syncing staking rewards for ${publicKey.toBase58()} at ${Date.now()}`;
            const encodedMessage = new TextEncoder().encode(message);
            const signatureUint8 = await signMessage(encodedMessage);
            const signature = bs58.encode(signatureUint8);

            await axios.post('/api/staking/sync', {
                walletAddress: publicKey.toBase58(),
                signature,
                message
            });

            const listRes = await axios.get(`/api/staking/buy-boost?address=${publicKey.toBase58()}`);
            const historyRes = await axios.get(`/api/staking/history?address=${publicKey.toBase58()}`);

            setNfts(listRes.data.nfts);
            setRawStakes(listRes.data.rawStakes || []);
            setAllBoosts(listRes.data.activeBoosts || []);
            setTotalClaimed(historyRes.data.totals);
            setHistory(historyRes.data.history);

            try {
                const balanceRes = await axios.get(`/api/user/balance?address=${publicKey.toBase58()}&mint=${SKR_TOKEN_MINT}`);
                setSkrBalance(balanceRes.data.balance || 0);
            } catch (balErr) {
                console.warn("Balance API not found. Defaulting to 0.");
                setSkrBalance(0);
            }

        } catch (err) {
            console.error('Critical Staking load error', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [publicKey]);

    const handleBuyBoost = async (mint: string, mult: number, price: number) => {
        if (!SKR_TOKEN_MINT || !TREASURY_WALLET) {
            return alert("System Error: Configuration missing.");
        }

        if (!publicKey || !wallet.connected) {
            return alert("Wallet not connected");
        }

        if (!confirm(`Queue x${mult} boost? Cost: ${price} SKR`)) return;

        setLoading(true);

        try {
            const umi = createUmi(connection.rpcEndpoint)
                .use(walletAdapterIdentity(wallet))
                .use(mplToolbox());

            const mintPubKey = umiPublicKey(SKR_TOKEN_MINT);
            const treasuryPubKey = umiPublicKey(TREASURY_WALLET);

            const userAta = findAssociatedTokenPda(umi, {
                mint: mintPubKey,
                owner: umi.identity.publicKey
            });

            const treasuryAta = findAssociatedTokenPda(umi, {
                mint: mintPubKey,
                owner: treasuryPubKey,
            });

            const builder = transactionBuilder()
                .add(transferTokens(umi, {
                    source: userAta,
                    destination: treasuryAta,
                    amount: BigInt(Math.floor(price * 1_000_000)), // Assuming 6 decimals
                }));

            const result = await builder.sendAndConfirm(umi);
            const signature = bs58.encode(result.signature);

            await axios.post('/api/boost/verify-payment', {
                signature: signature,
                userAddress: publicKey.toBase58(),
                mintAddress: mint,
                multiplier: mult
            });

            alert("Boost successfully queued!");
            await loadData();

        } catch (err: any) {
            console.error("Boost Error Details:", err);
            alert(`Transaction Failed: ${err.message || "Check console"}`);
        } finally {
            setLoading(false);
        }
    };

    const handleClaim = async (nft: any) => {
        if (!publicKey || !signMessage) return;
        setLoading(true);
        try {
            const message = `Claiming staking rewards for ${publicKey.toBase58()} at ${Date.now()}`;
            const encodedMessage = new TextEncoder().encode(message);
            const signatureUint8 = await signMessage(encodedMessage);
            const signature = bs58.encode(signatureUint8);

            const res = await axios.post('/api/staking/sync', {
                walletAddress: publicKey.toBase58(),
                signature,
                message
            });
            if (res.data.depositedLaam > 0) {
                alert(`SUCCESS: ${Math.floor(res.data.depositedLaam)} LAAM & ${Math.floor(res.data.depositedTag)} TAG DEPOSITED!`);
            } else {
                alert("Vault update: No rewards ready to move yet.");
            }
            await loadData();
        } catch (err) {
            alert("Sync/Claim failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (nft: any) => {
        if (!publicKey) return;
        setLoading(true);
        try {
            if (!nft.staked) {
                const result = await stakeNftOnChain(wallet, nft.mint);
                if (result.success) {
                    await axios.post('/api/staking/stake', {
                        walletAddress: publicKey.toBase58(),
                        mintAddress: nft.mint,
                        signature: result.signature
                    });
                }
            } else {
                const result = await unstakeNftOnChain(wallet, nft.mint);
                if (result.success) {
                    alert("NFT successfully released to your wallet!");
                }
            }
            await loadData();
        } catch (err: any) {
            alert(err.message || "Action failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SeekerGuard>
            <div className="main-content">
                <Head><title>LAAMTAG | Staking Arena</title></Head>

                {selectedNftForSchedule && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(10px)' }}>
                        <div className="terminal-card" style={{ maxWidth: '500px', width: '100%', padding: '24px', border: '1px solid #a855f7', position: 'relative' }}>
                            <button onClick={() => setSelectedNftForSchedule(null)} style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                            <h2 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Calendar size={20} color="#a855f7" /> BOOST PIPELINE
                            </h2>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '15px' }}>ASSET: {selectedNftForSchedule.name}</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
                                {allBoosts.filter(b => b.mintAddress === selectedNftForSchedule.mint).map((b) => {
                                    const isActive = new Date(b.activatedAt) <= new Date() && new Date(b.expiresAt) > new Date();
                                    return (
                                        <div key={b.id} style={{ padding: '12px', background: isActive ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.03)', borderRadius: '8px', border: isActive ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.1)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span style={{ fontWeight: 900, color: isActive ? '#a855f7' : '#fff', fontSize: '11px' }}>
                                                    {isActive ? '● ACTIVE' : '○ QUEUED'}
                                                </span>
                                                <span style={{ color: '#eab308', fontWeight: 900, fontSize: '11px' }}>x{b.multiplier} MULTIPLIER</span>
                                            </div>

                                            {isActive && (
                                                <div style={{ fontSize: '10px', marginBottom: '8px', padding: '4px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>REMAINING: </span>
                                                    <BoostCountdown expiresAt={b.expiresAt} />
                                                </div>
                                            )}

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '9px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                                                <div>STARTS: {new Date(b.activatedAt).toLocaleString()}</div>
                                                <div>ENDS: {new Date(b.expiresAt).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div className="content-wrapper">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                        <div style={{
                            background: 'rgba(168, 85, 247, 0.1)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Wallet size={12} color="#a855f7" />
                            <span style={{ fontSize: '10px', fontWeight: 900, color: '#fff' }}>
                                {skrBalance.toLocaleString()} <span style={{ color: '#a855f7' }}>$SKR</span>
                            </span>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h1 className="page-title">The <span style={{ color: '#eab308' }}>Vault</span></h1>
                        <p className="terminal-desc" style={{ fontSize: '10px' }}>PROTOCOL: ASSET_LOCK_V2</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                        <div className="terminal-card" style={{ padding: '16px', textAlign: 'center' }}>
                            <Lock size={16} color="#eab308" style={{ margin: '0 auto 8px' }} />
                            <p style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>{nfts.filter(n => n.staked).length}</p>
                            <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 900 }}>LOCKED ASSETS</p>
                        </div>
                        <div className="terminal-card" style={{ padding: '16px', textAlign: 'center' }}>
                            <Zap size={16} color="#a855f7" style={{ margin: '0 auto 8px' }} />
                            <p style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>{Math.floor(totalClaimed.laam)}</p>
                            <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 900 }}>TOTAL LAAM EARNED</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {nfts.map((nft) => {
                            const stakeData = rawStakes.find(s => s.mintAddress === nft.mint);
                            const nftBoosts = allBoosts.filter(b => b.mintAddress === nft.mint);

                            // 1. Calculate Active Multiplier (only if current time is within activation range)
                            const activeBoost = nftBoosts.find(b =>
                                new Date(b.activatedAt) <= new Date() && new Date(b.expiresAt) > new Date()
                            );
                            const currentMult = activeBoost?.multiplier || 1;

                            // 2. Identify Upcoming Multiplier (bought but not yet midnight)
                            const queuedBoost = nftBoosts.find(b => new Date(b.activatedAt) > new Date());
                            const queuedCount = nftBoosts.filter(b => new Date(b.activatedAt) > new Date()).length;

                            return (
                                <div key={nft.mint} className="terminal-card" style={{ padding: '12px' }}>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        <div style={{ width: '80px', height: '80px', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
                                            <img src={nft.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: nft.staked ? 0.5 : 1 }} />

                                            {currentMult > 1 && (
                                                <div style={{ position: 'absolute', top: 4, right: 4, background: '#a855f7', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 900 }}>
                                                    x{currentMult}
                                                </div>
                                            )}

                                            {queuedCount > 0 && (
                                                <div
                                                    onClick={() => setSelectedNftForSchedule(nft)}
                                                    style={{ position: 'absolute', bottom: 4, right: 4, background: '#eab308', color: 'black', padding: '2px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}
                                                >
                                                    <Layers size={8} /> +{queuedCount}
                                                </div>
                                            )}

                                            {nft.staked && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={20} color="#eab308" /></div>}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '14px', fontWeight: 900, margin: 0 }}>{nft.name}</h3>
                                            {nft.staked && stakeData ? (
                                                <RewardTicker
                                                    stakedAt={stakeData.stakedAt}
                                                    lastClaimed={stakeData.lastClaimed}
                                                    multiplier={currentMult}
                                                    upcomingMultiplier={queuedBoost?.multiplier || 0}
                                                />
                                            ) : (
                                                <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>READY TO LOCK</p>
                                            )}
                                        </div>
                                    </div>

                                    {nft.staked && (
                                        <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '8px', border: '1px dashed rgba(168, 85, 247, 0.3)' }}>
                                            <p style={{ fontSize: '9px', fontWeight: 900, color: '#a855f7', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ display: 'flex', alignItems: 'center' }}><TrendingUp size={10} style={{ marginRight: '4px' }} /> UPGRADE REWARDS</span>
                                                {(currentMult > 1 || queuedCount > 0) && (
                                                    <button
                                                        onClick={() => setSelectedNftForSchedule(nft)}
                                                        style={{ background: 'none', border: 'none', color: '#eab308', fontSize: '8px', fontWeight: 900, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                                    >
                                                        VIEW SCHEDULE
                                                    </button>
                                                )}
                                            </p>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                                {boostOptions.map(opt => (
                                                    <button
                                                        key={opt.mult}
                                                        onClick={() => handleBuyBoost(nft.mint, opt.mult, opt.price)}
                                                        disabled={loading}
                                                        style={{
                                                            fontSize: '9px',
                                                            padding: '6px',
                                                            background: 'rgba(168, 85, 247, 0.2)',
                                                            color: '#fff',
                                                            border: '1px solid rgba(168, 85, 247, 0.3)',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontWeight: 700
                                                        }}
                                                    >
                                                        {opt.mult}x ({opt.price} SKR)
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                        {nft.staked && stakeData && (
                                            <ClaimButton
                                                lastClaimed={stakeData.lastClaimed}
                                                stakedAt={stakeData.stakedAt}
                                                onClaim={() => handleClaim(nft)}
                                                loading={loading}
                                            />
                                        )}

                                        <button
                                            disabled={loading}
                                            onClick={() => handleAction(nft)}
                                            className="primary-btn"
                                            style={{
                                                padding: '10px',
                                                fontSize: '11px',
                                                background: nft.staked ? 'rgba(255,255,255,0.05)' : '#eab308',
                                                color: nft.staked ? '#fff' : '#000',
                                                fontWeight: 900
                                            }}
                                        >
                                            {loading ? "PROCESSING..." : nft.staked ? "UNSTAKE NFT (RELEASE)" : "LOCK ASSET"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="terminal-card" style={{ marginTop: '40px', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <History size={16} color="#eab308" />
                            <h2 style={{ fontSize: '12px', fontWeight: 900, margin: 0 }}>RECENT ACTIVITY</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {history.slice(0, 5).map((item) => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                                    <span style={{ opacity: 0.5 }}>{new Date(item.unstakedAt).toLocaleDateString()}</span>
                                    <span style={{ fontWeight: 900, color: '#eab308' }}>+{Math.floor(item.laamEarned)} LAAM</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </SeekerGuard>
    );
}