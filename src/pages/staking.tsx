import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import SeekerGuard from '../components/SeekerGuard';
import axios from 'axios';
import { Lock, Zap, Clock, TrendingUp, Layers, X, Calendar, Wallet } from 'lucide-react';
import { stakeNftOnChain } from '../lib/stakeNftTask';
import { unstakeNftOnChain } from '../lib/unstakeNftTask';
import { mplToolbox, findAssociatedTokenPda, transferTokens } from '@metaplex-foundation/mpl-toolbox';
import { transactionBuilder } from '@metaplex-foundation/umi';
import bs58 from 'bs58';
import styles from '../styles/Staking.module.css';

const RewardTicker = ({ stakedAt, lastClaimed, multiplier = 1, upcomingMultiplier = 0 }: {
    stakedAt: string; lastClaimed: string; multiplier?: number; upcomingMultiplier?: number;
}) => {
    const [rewards, setRewards] = useState({ laam: 0, tag: 0 });
    const [timeLeft, setTimeLeft] = useState<string | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const start = new Date(stakedAt).getTime();
            const last = new Date(lastClaimed).getTime();
            const lockDuration = 48 * 3600 * 1000;
            const elapsed = now - start;
            if (elapsed < lockDuration) {
                const remaining = lockDuration - elapsed;
                const h = Math.floor(remaining / (3600 * 1000));
                const m = Math.floor((remaining % (3600 * 1000)) / (60 * 1000));
                setTimeLeft(`LOCKED: ${h}h ${m}m left`);
                setRewards({ laam: 0, tag: 0 });
            } else {
                setTimeLeft(null);
                const secs = Math.max(0, Math.floor((now - last) / 1000));
                setRewards({
                    laam: secs * (500 / 86400) * multiplier,
                    tag: secs * (20 / 86400) * multiplier,
                });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [stakedAt, lastClaimed, multiplier]);

    return (
        <div className={styles.ticker}>
            {timeLeft ? (
                <div className={styles.tickerLocked}>
                    <Clock size={10} />
                    <span>{timeLeft}</span>
                </div>
            ) : (
                <div className={styles.tickerGrid}>
                    <div className={styles.tickerCell}>
                        <span className={styles.tickerLabel}>
                            LAAM ACCRUED
                            {multiplier > 1 && <span className={styles.multBadge}>x{multiplier}</span>}
                        </span>
                        <span className={styles.tickerValGold}>{rewards.laam.toFixed(4)}</span>
                        {upcomingMultiplier > 0 && (
                            <span className={styles.tickerUpcoming}>● Next: x{upcomingMultiplier}</span>
                        )}
                    </div>
                    <div className={styles.tickerCell}>
                        <span className={styles.tickerLabel}>TAG ACCRUED</span>
                        <span className={styles.tickerVal}>{rewards.tag.toFixed(4)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const ClaimButton = ({ lastClaimed, onClaim, loading, stakedAt, multiplier = 1 }: any) => {
    const [cooldown, setCooldown] = useState<string | null>(null);
    const [pendingRewards, setPendingRewards] = useState({ laam: 0, tag: 0 });

    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();
            const stakeTime = new Date(stakedAt).getTime();
            const lastClaimTime = lastClaimed ? new Date(lastClaimed).getTime() : stakeTime;
            const lock48h = 48 * 3600 * 1000;
            const cooldown24h = 24 * 3600 * 1000;

            if (now - stakeTime < lock48h) {
                const r = lock48h - (now - stakeTime);
                setCooldown(`VAULT LOCK: ${Math.floor(r / (3600 * 1000))}h ${Math.floor((r % (3600 * 1000)) / (60 * 1000))}m`);
                setPendingRewards({ laam: 0, tag: 0 });
            } else {
                const secs = Math.floor((now - lastClaimTime) / 1000);
                setPendingRewards({
                    laam: Math.max(0, secs * (500 / 86400) * multiplier),
                    tag: Math.max(0, secs * (20 / 86400) * multiplier),
                });
                if (now - lastClaimTime < cooldown24h) {
                    const r = cooldown24h - (now - lastClaimTime);
                    setCooldown(`NEXT CLAIM: ${Math.floor(r / (3600 * 1000))}h ${Math.floor((r % (3600 * 1000)) / (60 * 1000))}m`);
                } else {
                    setCooldown(null);
                }
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [lastClaimed, stakedAt, multiplier]);

    const isLocked = !!cooldown;

    return (
        <button
            disabled={loading || isLocked}
            onClick={onClaim}
            className={`${styles.claimBtn} ${isLocked ? styles.claimBtnLocked : styles.claimBtnReady}`}
        >
            {loading ? 'INITIALIZING TRANSFER...' : isLocked ? (
                <span>{cooldown}</span>
            ) : (
                <>
                    <span className={styles.claimBtnLabel}>CLAIM REWARDS</span>
                    <span className={styles.claimBtnRewards}>
                        +{pendingRewards.laam.toFixed(2)} LAAM &nbsp;|&nbsp; +{pendingRewards.tag.toFixed(2)} TAG
                    </span>
                </>
            )}
        </button>
    );
};

const BoostCountdown = ({ expiresAt }: { expiresAt: string }) => {
    const [timeStr, setTimeStr] = useState('');
    useEffect(() => {
        const interval = setInterval(() => {
            const diff = new Date(expiresAt).getTime() - Date.now();
            if (diff <= 0) { setTimeStr('EXPIRING...'); return; }
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeStr(`${d}d ${h}h ${m}m ${s}s`);
        }, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);
    return <span className={styles.boostCountdown}>{timeStr}</span>;
};

export default function VaultPage() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const { publicKey, signMessage } = wallet;

    const SKR_TOKEN_MINT = process.env.NEXT_PUBLIC_SKR_TOKEN_MINT || 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3';
    const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || 'CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc';

    const [nfts, setNfts] = useState<any[]>([]);
    const [rawStakes, setRawStakes] = useState<any[]>([]);
    const [allBoosts, setAllBoosts] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [totalClaimed, setTotalClaimed] = useState({ laam: 0, tag: 0 });
    const [skrBalance, setSkrBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [selectedNftForSchedule, setSelectedNftForSchedule] = useState<any | null>(null);

    const boostOptions = [
        { mult: 2, price: 500 }, { mult: 3, price: 800 }, { mult: 5, price: 1400 },
        { mult: 10, price: 3000 }, { mult: 50, price: 18000 }, { mult: 100, price: 40000 },
    ];

    const loadData = async () => {
        if (!publicKey || !signMessage) return;
        try {
            const message = `Syncing staking rewards for ${publicKey.toBase58()} at ${Date.now()}`;
            const encodedMessage = new TextEncoder().encode(message);
            const signatureUint8 = await signMessage(encodedMessage);
            const signature = bs58.encode(signatureUint8);

            await axios.post('/api/staking/sync', { walletAddress: publicKey.toBase58(), signature, message });
            const listRes = await axios.get(`/api/staking/buy-boost?address=${publicKey.toBase58()}`);
            const historyRes = await axios.get(`/api/staking/history?address=${publicKey.toBase58()}`);

            setNfts(listRes.data.nfts);
            setRawStakes(listRes.data.rawStakes || []);
            setAllBoosts(listRes.data.activeBoosts || []);
            setTotalClaimed(historyRes.data.totals);
            setHistory(historyRes.data.history);

            const balanceRes = await axios.get(`/api/user/balance?address=${publicKey.toBase58()}&mint=${SKR_TOKEN_MINT}`);
            setSkrBalance(balanceRes.data.balance || 0);
        } catch (err) {
            console.error('Staking load error', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [publicKey]);

    const handleBuyBoost = async (mint: string, mult: number, price: number) => {
        if (!publicKey || !wallet.connected) return alert('Wallet not connected');
        if (!confirm(`Queue x${mult} boost? Cost: ${price} SKR`)) return;
        setLoading(true);
        try {
            const umi = createUmi(connection.rpcEndpoint).use(walletAdapterIdentity(wallet)).use(mplToolbox());
            const mintPubKey = umiPublicKey(SKR_TOKEN_MINT);
            const treasuryPubKey = umiPublicKey(TREASURY_WALLET);
            const userAta = findAssociatedTokenPda(umi, { mint: mintPubKey, owner: umi.identity.publicKey });
            const treasuryAta = findAssociatedTokenPda(umi, { mint: mintPubKey, owner: treasuryPubKey });
            const builder = transactionBuilder().add(transferTokens(umi, {
                source: userAta, destination: treasuryAta,
                amount: BigInt(Math.floor(price * 1_000_000)),
            }));
            const result = await builder.sendAndConfirm(umi);
            await axios.post('/api/boost/verify-payment', {
                signature: bs58.encode(result.signature),
                userAddress: publicKey.toBase58(),
                mintAddress: mint,
                multiplier: mult,
            });
            alert('Boost successfully queued!');
            await loadData();
        } catch (err: any) {
            alert(`Transaction Failed: ${err.message}`);
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
            const res = await axios.post('/api/staking/sync', { walletAddress: publicKey.toBase58(), signature, message });
            if (res.data.depositedLaam > 0) {
                alert(`SUCCESS: ${Math.floor(res.data.depositedLaam)} LAAM & ${Math.floor(res.data.depositedTag)} TAG DEPOSITED!`);
            } else {
                alert('Vault update: No rewards ready to move yet.');
            }
            await loadData();
        } catch {
            alert('Sync/Claim failed.');
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
                        signature: result.signature,
                    });
                }
            } else {
                const result = await unstakeNftOnChain(wallet, nft.mint);
                if (result.success) alert('NFT successfully released!');
            }
            await loadData();
        } catch (err: any) {
            alert(err.message || 'Action failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SeekerGuard>
            <div className="main-content">
                <Head><title>LAAMTAG | Staking Arena</title></Head>

                {/* ── BOOST MODAL ── */}
                {selectedNftForSchedule && (
                    <div className={styles.modalBackdrop}>
                        <div className={styles.modal}>
                            <button onClick={() => setSelectedNftForSchedule(null)} className={styles.modalClose}>
                                <X size={18} />
                            </button>
                            <h2 className={styles.modalTitle}>
                                <Calendar size={16} className={styles.purpleIcon} />
                                BOOST PIPELINE
                            </h2>
                            <div className={styles.boostList}>
                                {allBoosts.filter(b => b.mintAddress === selectedNftForSchedule.mint).map((b) => {
                                    const isActive = new Date(b.activatedAt) <= new Date() && new Date(b.expiresAt) > new Date();
                                    return (
                                        <div key={b.id} className={`${styles.boostItem} ${isActive ? styles.boostItemActive : ''}`}>
                                            <div className={styles.boostItemHeader}>
                                                <span className={`${styles.boostStatus} ${isActive ? styles.boostStatusActive : styles.boostStatusQueued}`}>
                                                    {isActive ? '● ACTIVE' : '○ QUEUED'}
                                                </span>
                                                <span className={styles.boostMult}>x{b.multiplier} MULTIPLIER</span>
                                            </div>
                                            {isActive && <BoostCountdown expiresAt={b.expiresAt} />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div className="content-wrapper">

                    {/* ── SKR BALANCE ── */}
                    <div className={styles.topBar}>
                        <div className={styles.skrChip}>
                            <Wallet size={11} className={styles.purpleIcon} />
                            <span className={styles.skrVal}>{skrBalance.toLocaleString()}</span>
                            <span className={styles.skrLabel}>$SKR</span>
                        </div>
                    </div>

                    {/* ── HEADER ── */}
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>The <span className={styles.titleAccent}>Vault</span></h1>
                        <p className={styles.pageSubtitle}>PROTOCOL: ASSET_LOCK_V2</p>
                    </div>

                    {/* ── STATS STRIP ── */}
                    <div className={styles.statsStrip}>
                        <div className={styles.statCell}>
                            <Lock size={14} className={styles.goldIcon} />
                            <span className={styles.statVal}>{nfts.filter(n => n.staked).length}</span>
                            <span className={styles.statLabel}>LOCKED ASSETS</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.statCell}>
                            <Zap size={14} className={styles.purpleIcon} />
                            <span className={styles.statVal}>{Math.floor(totalClaimed.laam).toLocaleString()}</span>
                            <span className={styles.statLabel}>LAAM EARNED</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.statCell}>
                            <Zap size={14} className={styles.dimIcon} />
                            <span className={styles.statVal}>{Math.floor(totalClaimed.tag).toLocaleString()}</span>
                            <span className={styles.statLabel}>TAG EARNED</span>
                        </div>
                    </div>

                    {/* ── NFT CARDS ── */}
                    <div className={styles.nftList}>
                        {nfts.map((nft) => {
                            const stakeData = rawStakes.find(s => s.mintAddress === nft.mint);
                            const nftBoosts = allBoosts.filter(b => b.mintAddress === nft.mint);
                            const activeBoost = nftBoosts.find(b => new Date(b.activatedAt) <= new Date() && new Date(b.expiresAt) > new Date());
                            const currentMult = activeBoost?.multiplier || 1;
                            const queuedBoost = nftBoosts.find(b => new Date(b.activatedAt) > new Date());
                            const queuedCount = nftBoosts.filter(b => new Date(b.activatedAt) > new Date()).length;

                            return (
                                <div key={nft.mint} className={`${styles.nftCard} ${nft.staked ? styles.nftCardStaked : ''}`}>

                                    {/* Top row: image + info */}
                                    <div className={styles.nftTop}>
                                        <div className={styles.nftImgWrap}>
                                            <img
                                                src={nft.image} alt={nft.name}
                                                className={`${styles.nftImg} ${nft.staked ? styles.nftImgStaked : ''}`}
                                            />
                                            {currentMult > 1 && (
                                                <span className={styles.multPill}>x{currentMult}</span>
                                            )}
                                            {queuedCount > 0 && (
                                                <span className={styles.queuePill} onClick={() => setSelectedNftForSchedule(nft)}>
                                                    <Layers size={7} />+{queuedCount}
                                                </span>
                                            )}
                                            {nft.staked && (
                                                <div className={styles.nftLockOverlay}>
                                                    <Lock size={18} className={styles.goldIcon} />
                                                </div>
                                            )}
                                        </div>

                                        <div className={styles.nftInfo}>
                                            <h3 className={styles.nftName}>{nft.name}</h3>
                                            {nft.staked && stakeData ? (
                                                <RewardTicker
                                                    stakedAt={stakeData.stakedAt}
                                                    lastClaimed={stakeData.lastClaimed}
                                                    multiplier={currentMult}
                                                    upcomingMultiplier={queuedBoost?.multiplier || 0}
                                                />
                                            ) : (
                                                <p className={styles.nftReady}>READY TO LOCK</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Boost upgrade section */}
                                    {nft.staked && (
                                        <div className={styles.boostSection}>
                                            <div className={styles.boostSectionHeader}>
                                                <span className={styles.boostSectionTitle}>
                                                    <TrendingUp size={10} /> UPGRADE REWARDS
                                                </span>
                                                {(currentMult > 1 || queuedCount > 0) && (
                                                    <button onClick={() => setSelectedNftForSchedule(nft)} className={styles.viewScheduleBtn}>
                                                        VIEW SCHEDULE
                                                    </button>
                                                )}
                                            </div>
                                            <div className={styles.boostGrid}>
                                                {boostOptions.map(opt => (
                                                    <button
                                                        key={opt.mult}
                                                        onClick={() => handleBuyBoost(nft.mint, opt.mult, opt.price)}
                                                        disabled={loading}
                                                        className={styles.boostOptBtn}
                                                    >
                                                        <span className={styles.boostOptMult}>{opt.mult}x</span>
                                                        <span className={styles.boostOptPrice}>{opt.price} SKR</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className={styles.nftActions}>
                                        {nft.staked && stakeData && (
                                            <ClaimButton
                                                lastClaimed={stakeData.lastClaimed}
                                                stakedAt={stakeData.stakedAt}
                                                onClaim={() => handleClaim(nft)}
                                                loading={loading}
                                                multiplier={currentMult}
                                            />
                                        )}
                                        <button
                                            disabled={loading}
                                            onClick={() => handleAction(nft)}
                                            className={`${styles.actionBtn} ${nft.staked ? styles.actionBtnUnstake : styles.actionBtnStake}`}
                                        >
                                            {loading ? 'PROCESSING...' : nft.staked ? 'UNSTAKE — RELEASE ASSET' : 'LOCK ASSET'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {nfts.length === 0 && !loading && (
                            <div className={styles.emptyState}>
                                <Lock size={20} className={styles.emptyIcon} />
                                <p>No assets available to lock</p>
                            </div>
                        )}

                        {loading && nfts.length === 0 && (
                            <div className={styles.loadingState}>
                                <p className={styles.loadingText}>SYNCING VAULT...</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </SeekerGuard>
    );
}