import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shield, Zap, Target, Loader2, Lock, Coins, RefreshCw, Box, Sword } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { mplToolbox, transferTokens, findAssociatedTokenPda, setComputeUnitPrice, createAssociatedToken } from "@metaplex-foundation/mpl-toolbox";

const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
import axios from 'axios';
import WarriorTimer from './BattleFieldWarriorTimer';
import styles from '../styles/BattleField.module.css';

const TREASURY_WALLET = new PublicKey("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc");
const COLLECTION_IMAGE = "https://gateway.pinata.cloud/ipfs/QmWLfNnKrFyyCQ35TouqiuNFE3Aq5rdQigZ4rtKC1M9wZ1/collection.png";
const SKR_MINT = new PublicKey("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");
const OMEGA_FEE = 300;

const BattleField = () => {
    const wallet = useWallet();                        // ✅ full object
    const { publicKey, sendTransaction } = wallet;
    const { connection } = useConnection();

    const [allDeployed, setAllDeployed] = useState<any[]>([]);
    const [walletNfts, setWalletNfts] = useState<any[]>([]);
    const [warCredits, setWarCredits] = useState(0);
    const [loading, setLoading] = useState(true);
    const [fetchingWallet, setFetchingWallet] = useState(false);
    const [selectedWarrior, setSelectedWarrior] = useState<string | null>(null);
    const [isClaiming, setIsClaiming] = useState<string | null>(null);

    const barracksUnits = useMemo(() => allDeployed.filter(w => w.status === 'IDLE'), [allDeployed]);
    const battlefieldUnits = useMemo(() => allDeployed.filter(w => w.status === 'DEPLOYED'), [allDeployed]);

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
        if (!publicKey || !wallet.connected) return alert("Connect Wallet First");
        setLoading(true);
        try {
            const umi = createUmi(RPC_URL)
                .use(walletAdapterIdentity(wallet))   // ✅ full wallet
                .use(mplToolbox());

            const mint = umiPublicKey(nft.mint);
            const userOwner = umiPublicKey(publicKey.toBase58());
            const treasuryOwner = umiPublicKey(TREASURY_WALLET.toBase58());

            const source = findAssociatedTokenPda(umi, { mint, owner: userOwner })[0];
            const destination = findAssociatedTokenPda(umi, { mint, owner: treasuryOwner })[0];

            // ✅ Create treasury ATA if it doesn't exist for this NFT mint
            const destAccount = await umi.rpc.getAccount(destination);
            let builder = setComputeUnitPrice(umi, { microLamports: 100_000 });
            if (!destAccount.exists) {
                builder = builder.add(createAssociatedToken(umi, { mint, owner: treasuryOwner }));
            }
            builder = builder.add(transferTokens(umi, {
                source, destination, authority: umi.identity, amount: 1,
            }));

            const result = await builder.sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });
            const signature = base58.deserialize(result.signature)[0];

            const res = await fetch('/api/warriors/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mintAddress: nft.mint,
                    walletAddress: publicKey.toBase58(),
                    rarity: nft.rarity || "Common",
                    signature,
                    image: nft.image
                })
            });

            if (res.ok) {
                alert("UNIT REGISTERED: Moved to Barracks.");
                fetchBarracks();
            }
        } catch (err: any) {
            console.error("Deposit error:", err);
            alert(`Deposit failed: ${err?.message || JSON.stringify(err)}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeploy = async (sector: 'NORMAL' | 'VIP') => {
        if (!selectedWarrior || !publicKey || !wallet.connected) return;
        setLoading(true);
        try {
            let signature = null;

            if (sector === 'VIP') {
                const umi = createUmi(RPC_URL)
                    .use(walletAdapterIdentity(wallet))   // ✅ full wallet
                    .use(mplToolbox());

                const SKR_MINT_UMI = umiPublicKey(SKR_MINT.toBase58());
                const userOwner = umiPublicKey(publicKey.toBase58());
                const treasuryOwner = umiPublicKey(TREASURY_WALLET.toBase58());

                const source = findAssociatedTokenPda(umi, { mint: SKR_MINT_UMI, owner: userOwner })[0];
                const destination = findAssociatedTokenPda(umi, { mint: SKR_MINT_UMI, owner: treasuryOwner })[0];

                // ✅ Create treasury SKR ATA if it doesn't exist
                const destAccount = await umi.rpc.getAccount(destination);
                let builder = setComputeUnitPrice(umi, { microLamports: 100_000 });
                if (!destAccount.exists) {
                    builder = builder.add(createAssociatedToken(umi, { mint: SKR_MINT_UMI, owner: treasuryOwner }));
                }
                builder = builder.add(transferTokens(umi, {
                    source, destination, authority: umi.identity,
                    amount: BigInt(OMEGA_FEE * 1_000_000),
                }));

                const result = await builder.sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });
                signature = base58.deserialize(result.signature)[0];
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
        } catch (err: any) {
            console.error("Deploy error:", err);
            alert(`Deployment failed: ${err?.message || JSON.stringify(err)}`);
        } finally {
            setLoading(false);
        }
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
        if (!publicKey || !wallet.connected) return alert("Please connect your wallet.");
        if (!confirm("Withdraw NFT back to your wallet?")) return;
        setLoading(true);
        try {
            const umi = createUmi(RPC_URL)
                .use(walletAdapterIdentity(wallet))   // ✅ full wallet
                .use(mplToolbox());

            const mint = umiPublicKey(mintAddress);
            const userOwner = umiPublicKey(publicKey.toBase58());
            const treasuryOwner = umiPublicKey(TREASURY_WALLET.toBase58());

            const source = findAssociatedTokenPda(umi, { mint, owner: treasuryOwner })[0];
            const destination = findAssociatedTokenPda(umi, { mint, owner: userOwner })[0];

            // ✅ Create user ATA if it doesn't exist
            const destAccount = await umi.rpc.getAccount(destination);
            let builder = setComputeUnitPrice(umi, { microLamports: 100_000 });
            if (!destAccount.exists) {
                builder = builder.add(createAssociatedToken(umi, { mint, owner: userOwner }));
            }
            builder = builder.add(transferTokens(umi, {
                source, destination, authority: umi.identity, amount: 1,
            }));

            const result = await builder.sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });
            const signature = base58.deserialize(result.signature)[0];

            const res = await fetch('/api/warriors/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mintAddress, walletAddress: publicKey.toBase58(), signature })
            });

            if (res.ok) {
                alert("SUCCESS: NFT returned to your wallet.");
                fetchBarracks();
            } else {
                const err = await res.json();
                alert(`Blockchain success, but database update failed: ${err.error}`);
            }
        } catch (err: any) {
            console.error("Withdrawal error:", err);
            alert(`Withdrawal failed: ${err?.message || JSON.stringify(err)}`);
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