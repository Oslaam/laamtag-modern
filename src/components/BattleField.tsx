import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shield, Zap, Target, Loader2, Lock, Coins, RefreshCw, Box, Sword } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, PublicKey, ComputeBudgetProgram } from '@solana/web3.js';
import {
    createTransferCheckedInstruction,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import axios from 'axios';
import WarriorTimer from './BattleFieldWarriorTimer';
import styles from '../styles/BattleField.module.css';

const TREASURY_WALLET = new PublicKey("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc");
const COLLECTION_IMAGE = "https://gateway.pinata.cloud/ipfs/QmWLfNnKrFyyCQ35TouqiuNFE3Aq5rdQigZ4rtKC1M9wZ1/collection.png";
const SKR_MINT = new PublicKey("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");
const OMEGA_FEE = 300;

const BattleField = () => {
    const { publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();

    // States
    const [allDeployed, setAllDeployed] = useState<any[]>([]);
    const [walletNfts, setWalletNfts] = useState<any[]>([]);
    const [warCredits, setWarCredits] = useState(0);
    const [loading, setLoading] = useState(true);
    const [fetchingWallet, setFetchingWallet] = useState(false);
    const [selectedWarrior, setSelectedWarrior] = useState<string | null>(null);
    const [isClaiming, setIsClaiming] = useState<string | null>(null);

    // Filtered Groups
    const barracksUnits = useMemo(() => allDeployed.filter(w => w.status === 'IDLE'), [allDeployed]);
    const battlefieldUnits = useMemo(() => allDeployed.filter(w => w.status === 'DEPLOYED'), [allDeployed]);

    // Stable fetch functions using useCallback
    const fetchBarracks = useCallback(async () => {
        if (!publicKey) return;
        try {
            const res = await fetch(`/api/warriors/deployed?address=${publicKey.toBase58()}`);
            const data = await res.json();
            setAllDeployed(data);
        } catch (err) {
            console.error("Radar failure");
        } finally {
            setLoading(false);
        }
    }, [publicKey]);

    const fetchUserBalance = useCallback(async () => {
        if (!publicKey) return;
        try {
            const res = await fetch(`/api/user/credits?address=${publicKey.toBase58()}`);
            const data = await res.json();
            setWarCredits(data.balance || 0);
        } catch (err) {
            console.error("Balance sync failed");
        }
    }, [publicKey]);

    useEffect(() => {
        if (publicKey) {
            fetchBarracks();
            fetchUserBalance();
        }
    }, [publicKey, fetchBarracks, fetchUserBalance]);

    const fetchWalletNfts = async () => {
        if (!publicKey) return;
        setFetchingWallet(true);
        try {
            const res = await axios.get(`/api/collectable/warrior-list?address=${publicKey.toBase58()}`);
            const allNfts = res.data?.nfts || [];
            const registeredMints = allDeployed.map(w => w.mintAddress);
            const filtered = allNfts.filter((nft: any) => !registeredMints.includes(nft.mint));
            setWalletNfts(filtered);
        } catch (e) { console.error("Wallet Load Error:", e); }
        finally { setFetchingWallet(false); }
    };

    const handleDepositNFT = async (nft: any) => {
        if (!publicKey || !sendTransaction) return;
        setLoading(true);
        try {
            const mint = new PublicKey(nft.mint);
            const userAta = await getAssociatedTokenAddress(mint, publicKey);
            const treasuryAta = await getAssociatedTokenAddress(mint, TREASURY_WALLET);
            const tx = new Transaction();

            tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }));

            const treasuryAccountInfo = await connection.getAccountInfo(treasuryAta);
            if (!treasuryAccountInfo) {
                tx.add(createAssociatedTokenAccountInstruction(publicKey, treasuryAta, TREASURY_WALLET, mint));
            }

            tx.add(createTransferCheckedInstruction(userAta, mint, treasuryAta, publicKey, 1, 0));
            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            tx.recentBlockhash = blockhash;
            tx.feePayer = publicKey;

            const signature = await sendTransaction(tx, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            const res = await fetch('/api/warriors/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mintAddress: nft.mint,
                    walletAddress: publicKey.toBase58(),
                    rarity: nft.rarity || "Common",
                    signature: signature,
                    image: nft.image
                })
            });

            if (res.ok) {
                alert("UNIT REGISTERED: Moved to Barracks.");
                fetchBarracks();
            }
        } catch (err) { alert("Deposit failed."); }
        finally { setLoading(false); }
    };

    const handleDeploy = async (sector: 'NORMAL' | 'VIP') => {
        if (!selectedWarrior || !publicKey || !sendTransaction) return;
        setLoading(true);
        try {
            let signature = null;
            if (sector === 'VIP') {
                const userAta = await getAssociatedTokenAddress(SKR_MINT, publicKey);
                const treasuryAta = await getAssociatedTokenAddress(SKR_MINT, TREASURY_WALLET);
                const tx = new Transaction();

                tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }));

                const treasuryAccountInfo = await connection.getAccountInfo(treasuryAta);
                if (!treasuryAccountInfo) {
                    tx.add(createAssociatedTokenAccountInstruction(publicKey, treasuryAta, TREASURY_WALLET, SKR_MINT));
                }

                tx.add(createTransferCheckedInstruction(userAta, SKR_MINT, treasuryAta, publicKey, OMEGA_FEE * 1_000_000, 6));

                const { blockhash } = await connection.getLatestBlockhash('confirmed');
                tx.recentBlockhash = blockhash;
                tx.feePayer = publicKey;

                signature = await sendTransaction(tx, connection);
                await connection.confirmTransaction(signature, 'confirmed');
            }

            const res = await fetch('/api/warriors/mission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mintAddress: selectedWarrior,
                    walletAddress: publicKey.toBase58(),
                    sector,
                    signature
                })
            });

            if (res.ok) {
                setSelectedWarrior(null);
                fetchBarracks();
                alert("MISSION START: Unit deployed to Battlefield.");
            }
        } catch (err) { alert("Deployment failed."); }
        finally { setLoading(false); }
    };

    const handleClaim = async (mintAddress: string) => {
        if (!publicKey || isClaiming) return;
        setIsClaiming(mintAddress);
        try {
            const res = await fetch('/api/warriors/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mintAddress, walletAddress: publicKey.toBase58() })
            });
            const data = await res.json();
            if (res.ok) {
                const rewardAmount = data.reward || 0;
                setWarCredits(prevBalance => prevBalance + rewardAmount);
                alert(`EXTRACTION SUCCESSFUL: +${rewardAmount} War Credits!`);
                await fetchBarracks();
                await fetchUserBalance();
            } else {
                alert(`Extraction Error: ${data.error}`);
            }
        } catch (err) {
            alert("Extraction failed. Communications jammed.");
        } finally {
            setIsClaiming(null);
        }
    };

    const handleWithdraw = async (mintAddress: string) => {
        if (!confirm("Withdraw NFT back to your wallet?")) return;
        setLoading(true);
        try {
            const res = await fetch('/api/warriors/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mintAddress, walletAddress: publicKey?.toBase58() })
            });
            if (res.ok) {
                alert("SUCCESS: NFT returned to your wallet.");
                fetchBarracks();
            } else {
                const err = await res.json();
                alert(`Failed: ${err.error}`);
            }
        } catch (e) {
            alert("Communications error during withdrawal.");
        } finally {
            setLoading(false);
        }
    };

    if (loading && allDeployed.length === 0) return (
        <div className={styles.loading}>
            <Loader2 className="animate-spin" />
        </div>
    );

    return (
        <div className={styles.battlefieldFrame}>
            <div className={styles.statsHeader}>
                <div className={styles.creditBadge}>
                    <Coins size={14} style={{ marginRight: '5px' }} />
                    WAR CREDITS: {warCredits.toLocaleString()}
                </div>
            </div>

            <div className={styles.mapGrid}>
                <div className={styles.sectorContainer}>
                    <div className={`${styles.sector} ${styles.normalZone}`}>
                        <div className={styles.sectorHeader}><Shield /> SECTOR ALPHA</div>
                        <p>Stake: 100 TAG | 1.0x</p>
                        <button
                            disabled={!selectedWarrior}
                            onClick={() => handleDeploy('NORMAL')}
                            className={styles.deployAction}
                        >
                            {selectedWarrior ? "DEPLOY TO ALPHA" : "SELECT READY UNIT"}
                        </button>
                    </div>
                    <div className={`${styles.sector} ${styles.vipZone}`}>
                        <div className={styles.sectorHeader}><Zap color="#ef4444" /> SECTOR OMEGA</div>
                        <p>Stake: 300 $SKR | 2.5x</p>
                        <button
                            disabled={!selectedWarrior}
                            onClick={() => handleDeploy('VIP')}
                            className={styles.deployActionVip}
                        >
                            {selectedWarrior ? "INITIATE STRIKE" : "SELECT READY UNIT"}
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.terminalSection}>
                <div className={styles.terminalHeader}>
                    <Box size={18} /> <span>1. WALLET: REINFORCEMENTS</span>
                    <RefreshCw
                        size={14}
                        onClick={fetchWalletNfts}
                        className={fetchingWallet ? 'animate-spin' : ''}
                        style={{ cursor: 'pointer', marginLeft: 'auto' }}
                    />
                </div>
                <div className={styles.unitGridSmall}>
                    {walletNfts.map((nft) => (
                        <div key={nft.mint} className={styles.miniCard}>
                            <img src={nft.image || COLLECTION_IMAGE} alt="Wallet Unit" />
                            <div className={styles.miniInfo}>
                                <button onClick={() => handleDepositNFT(nft)}>DEPOSIT</button>
                            </div>
                        </div>
                    ))}
                    {walletNfts.length === 0 && <p className={styles.emptyText}>No NFTs in wallet.</p>}
                </div>
            </div>

            <div className={styles.terminalSection}>
                <div className={styles.terminalHeader}>
                    <Target size={18} /> <span>2. BARRACKS: READY FOR DEPLOYMENT</span>
                </div>
                <div className={styles.unitGrid}>
                    {barracksUnits.map((w) => (
                        <div
                            key={w.mintAddress}
                            className={`${styles.unitCard} ${selectedWarrior === w.mintAddress ? styles.selected : ''}`}
                        >
                            <img src={w.image || COLLECTION_IMAGE} className={styles.warriorImage} alt="Barracks Unit" />
                            <div className={styles.rarityBadge} data-rarity={w.rarity}>{w.rarity}</div>
                            <div className={styles.unitStatus}>
                                <span className={styles.availablePulse}>●</span> READY
                            </div>
                            <div className={styles.cardActions}>
                                <button
                                    className={styles.selectBtn}
                                    onClick={() => setSelectedWarrior(w.mintAddress)}
                                >
                                    {selectedWarrior === w.mintAddress ? "SELECTED" : "SELECT"}
                                </button>
                                <button
                                    className={styles.withdrawBtn}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleWithdraw(w.mintAddress);
                                    }}
                                >
                                    WITHDRAW
                                </button>
                            </div>
                        </div>
                    ))}
                    {barracksUnits.length === 0 && <p className={styles.emptyText}>No units ready. Deposit from wallet.</p>}
                </div>
            </div>

            <div className={styles.terminalSection}>
                <div className={styles.terminalHeader}>
                    <Sword size={18} /> <span>3. BATTLEFIELD: ACTIVE MISSIONS</span>
                </div>
                <div className={styles.unitGrid}>
                    {battlefieldUnits.map((w) => {
                        const isFinished = new Date() >= new Date(w.missionEnd);
                        return (
                            <div
                                key={w.mintAddress}
                                className={`${styles.unitCard} ${styles.locked} ${isFinished ? styles.readyGlow : ''}`}
                            >
                                <img src={w.image || COLLECTION_IMAGE} className={styles.warriorImage} alt="Combat Unit" />
                                <div className={styles.rarityBadge} data-rarity={w.rarity}>{w.rarity}</div>
                                <div className={styles.statusSection}>
                                    {!isFinished ? (
                                        <div className={styles.missionInfo}>
                                            <Lock size={12} />
                                            <WarriorTimer expiryDate={w.missionEnd} onFinished={fetchBarracks} />
                                        </div>
                                    ) : (
                                        <button
                                            disabled={isClaiming === w.mintAddress}
                                            onClick={(e) => { e.stopPropagation(); handleClaim(w.mintAddress); }}
                                            className={styles.claimButton}
                                        >
                                            {isClaiming === w.mintAddress ? "EXTRACTING..." : "EXTRACT REWARDS"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {battlefieldUnits.length === 0 && <p className={styles.emptyText}>No units currently in combat.</p>}
                </div>
            </div>
        </div>
    );
};

export default BattleField;