import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { RefreshCw, ShieldAlert, Rocket } from 'lucide-react';
import styles from '../styles/WarriorGallery.module.css';

const COLLECTION_IMAGE = "https://gateway.pinata.cloud/ipfs/QmWLfNnKrFyyCQ35TouqiuNFE3Aq5rdQigZ4rtKC1M9wZ1/collection.png";

export default function WarriorGallery() {
    const { publicKey } = useWallet();
    const [walletWarriors, setWalletWarriors] = useState<any[]>([]);
    const [deployedWarriors, setDeployedWarriors] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const loadAllWarriors = async () => {
        if (!publicKey) return;
        setLoading(true);
        try {
            const walletRes = await axios.get(`/api/collectable/warrior-list?address=${publicKey.toBase58()}`);
            const nftArray = walletRes.data?.nfts || [];
            setWalletWarriors(nftArray);

            const barracksRes = await fetch(`/api/warriors/deployed?address=${publicKey.toBase58()}`);
            const barracksData = await barracksRes.json();
            setDeployedWarriors(barracksData || []);

            await axios.post('/api/user/update-mints', {
                walletAddress: publicKey.toBase58(),
                actualCount: nftArray.length + (barracksData?.length || 0),
                type: 'warrior',
            });
        } catch (e) {
            console.error('Warrior Load Error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mounted && publicKey) loadAllWarriors();
    }, [publicKey, mounted]);

    if (!mounted || !publicKey) return null;

    const totalCount = walletWarriors.length + deployedWarriors.length;
    const isEmpty = totalCount === 0;

    return (
        <div className={styles.gallery}>
            <div className={styles.header}>
                <div>
                    <h3 className={styles.title}>
                        Neural <span className={styles.titleAccent}>Warriors</span>
                    </h3>
                    <p className={styles.count}>
                        Total Force: {totalCount} Units Detected
                    </p>
                </div>
                <button onClick={loadAllWarriors} disabled={loading} className={styles.refreshBtn}>
                    <RefreshCw size={13} className={loading ? styles.spinning : ''} />
                </button>
            </div>

            {loading ? (
                <div className={styles.loadingState}>
                    <p className={styles.loadingText}>SCANNING BIOMETRIC SIGNATURES...</p>
                </div>
            ) : isEmpty ? (
                <div className={styles.emptyState}>
                    <ShieldAlert size={22} className={styles.emptyIcon} />
                    <p className={styles.emptyText}>No combatants detected in sectors.</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {deployedWarriors.map((w) => (
                        <div key={w.mintAddress} className={`${styles.card} ${styles.cardDeployed}`}>
                            <div className={styles.deployedBadge}>
                                <Rocket size={7} />
                                <span>DEPLOYED</span>
                            </div>
                            <div className={styles.imgWrap}>
                                <img
                                    src={w.image || COLLECTION_IMAGE}
                                    alt="Deployed Warrior"
                                    className={`${styles.img} ${styles.imgDeployed}`}
                                />
                            </div>
                            <p className={`${styles.nftName} ${styles.nftNameCyan}`}>
                                {w.rarity} UNIT
                            </p>
                        </div>
                    ))}

                    {walletWarriors.map((nft) => (
                        <div key={nft.mint} className={styles.card}>
                            <div className={styles.imgWrap}>
                                <img
                                    src={nft.image || COLLECTION_IMAGE}
                                    alt={nft.name}
                                    className={styles.img}
                                />
                            </div>
                            <p className={styles.nftName}>{nft.name}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}