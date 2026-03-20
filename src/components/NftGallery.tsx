import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { stakeNftOnChain } from '../lib/stakeNftTask';
import { unstakeNftOnChain } from '../lib/unstakeNftTask';
import axios from 'axios';
import { Lock, RefreshCw } from 'lucide-react';
import styles from '../styles/NftGallery.module.css';

const NftCard = ({ nft, stakedData, wallet, onDataRefresh }: any) => {
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const isStaked = nft.staked;

    useEffect(() => {
        if (!isStaked || !stakedData?.stakedAt) return;
        const calculateTime = () => {
            const expiryDate = new Date(stakedData.stakedAt).getTime() + 48 * 60 * 60 * 1000;
            const diff = expiryDate - Date.now();
            if (diff <= 0) return 'READY TO UNSTAKE';
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff / (1000 * 60)) % 60);
            const s = Math.floor((diff / 1000) % 60);
            return `${h}H ${m}M ${s}S`;
        };
        setTimeLeft(calculateTime());
        const timer = setInterval(() => setTimeLeft(calculateTime()), 1000);
        return () => clearInterval(timer);
    }, [isStaked, stakedData]);

    const handleStakeAction = async () => {
        setIsProcessing(true);
        try {
            const onChainResult = await stakeNftOnChain(wallet, nft.mint);
            if (!onChainResult.success) throw new Error('On-chain stake failed');
            await axios.post('/api/staking/stake', {
                walletAddress: wallet.publicKey.toString(),
                mintAddress: nft.mint,
                signature: onChainResult.signature,
            });
            onDataRefresh();
        } catch (e) {
            console.error(e);
            alert('STAKING FAILED. VERIFY CREDENTIALS.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUnstakeAction = async () => {
        if (timeLeft !== 'READY TO UNSTAKE') return;
        setIsProcessing(true);
        try {
            const result = await unstakeNftOnChain(wallet, nft.mint);
            if (result.success) onDataRefresh();
        } catch (e) {
            console.error(e);
            alert('UNSTAKE FAILED. COOLDOWN ACTIVE.');
        } finally {
            setIsProcessing(false);
        }
    };

    const isReady = timeLeft === 'READY TO UNSTAKE';

    return (
        <div className={`${styles.card} ${isStaked ? styles.cardStaked : ''}`}>
            {isStaked && (
                <div className={styles.stakedBadge}>
                    <Lock size={8} />
                    <span>{timeLeft}</span>
                </div>
            )}

            <div className={styles.imgWrap}>
                <img
                    src={nft.image}
                    alt={nft.name}
                    className={`${styles.img} ${isStaked ? styles.imgStaked : ''}`}
                />
                {isStaked && <div className={styles.imgOverlay} />}
            </div>

            <p className={styles.nftName}>{nft.name}</p>

            {isStaked ? (
                <button
                    onClick={handleUnstakeAction}
                    disabled={!isReady || isProcessing}
                    className={`${styles.btn} ${isReady ? styles.btnUnstake : styles.btnLocked}`}
                >
                    {isProcessing ? 'PROCESSING...' : isReady ? 'RELEASE ASSET' : 'VAULT LOCKED'}
                </button>
            ) : (
                <button
                    onClick={handleStakeAction}
                    disabled={isProcessing}
                    className={`${styles.btn} ${styles.btnStake}`}
                >
                    {isProcessing ? 'INITIALIZING...' : 'SECURE IN VAULT'}
                </button>
            )}
        </div>
    );
};

export default function NftGallery() {
    const wallet = useWallet();
    const { publicKey } = wallet;
    const [nfts, setNfts] = useState<any[]>([]);
    const [rawStakes, setRawStakes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        if (!publicKey) return;
        setLoading(true);
        try {
            const res = await axios.get(`/api/staking/list?address=${publicKey.toString()}`);
            const nftArray = res.data.nfts;
            setNfts(nftArray);
            setRawStakes(res.data.rawStakes);
            await axios.post('/api/user/update-mints', {
                walletAddress: publicKey.toString(),
                actualCount: nftArray.length,
                type: 'genesis',
            });
        } catch (e) {
            console.error('Gallery Load Error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [publicKey]);

    if (!publicKey) return null;

    return (
        <div className={styles.gallery}>
            <div className={styles.header}>
                <div>
                    <h3 className={styles.title}>
                        Asset <span className={styles.titleAccent}>Inventory</span>
                    </h3>
                    <p className={styles.count}>Detected Items: {nfts.length}</p>
                </div>
                <button onClick={loadData} className={styles.refreshBtn}>
                    <RefreshCw size={13} className={loading ? styles.spinning : ''} />
                </button>
            </div>

            {loading ? (
                <div className={styles.loadingState}>
                    <p className={styles.loadingText}>SYNCHRONIZING SECURE SECTOR...</p>
                </div>
            ) : nfts.length === 0 ? (
                <div className={styles.emptyState}>
                    <p className={styles.emptyText}>NO ASSETS DETECTED</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {nfts.map((nft) => (
                        <NftCard
                            key={nft.mint}
                            nft={nft}
                            stakedData={rawStakes.find(s => s.mintAddress === nft.mint)}
                            wallet={wallet}
                            onDataRefresh={loadData}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}