import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { stakeNftOnChain } from '../lib/stakeNftTask';
import { unstakeNftOnChain } from '../lib/unstakeNftTask';
import axios from 'axios';
import { Lock, Unlock, ShieldCheck, RefreshCw } from 'lucide-react';

const NftCard = ({ nft, stakedData, wallet, onDataRefresh }: any) => {
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);

    const isStaked = nft.staked;

    useEffect(() => {
        if (!isStaked || !stakedData?.stakedAt) return;

        const calculateTime = () => {
            const COOLDOWN_HOURS = 48;
            const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
            const expiryDate = new Date(stakedData.stakedAt).getTime() + cooldownMs;
            const now = new Date().getTime();
            const diff = expiryDate - now;

            if (diff <= 0) return "READY TO UNSTAKE";

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff / (1000 * 60)) % 60);
            const s = Math.floor((diff / 1000) % 60);
            return `${h}H ${m}M ${s}S`;
        };

        const timer = setInterval(() => setTimeLeft(calculateTime()), 1000);
        return () => clearInterval(timer);
    }, [isStaked, stakedData]);

    const handleStakeAction = async () => {
        const mint = nft.mint;
        setIsProcessing(true);
        try {
            const onChainResult = await stakeNftOnChain(wallet, mint);
            if (!onChainResult.success) throw new Error("On-chain stake failed");

            await axios.post('/api/staking/stake', {
                walletAddress: wallet.publicKey.toString(),
                mintAddress: mint,
                signature: onChainResult.signature
            });

            onDataRefresh();
        } catch (e) {
            console.error(e);
            alert("STAKING FAILED. VERIFY CREDENTIALS.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUnstakeAction = async () => {
        if (timeLeft !== "READY TO UNSTAKE") return;
        setIsProcessing(true);
        try {
            const result = await unstakeNftOnChain(wallet, nft.mint);
            if (result.success) onDataRefresh();
        } catch (e) {
            console.error(e);
            alert("UNSTAKE FAILED. COOLDOWN ACTIVE.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="terminal-card" style={{ padding: '12px', position: 'relative', transition: 'all 0.3s' }}>
            {/* STAKED BADGE */}
            {isStaked && (
                <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
                    <div style={{
                        background: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid #eab308',
                        color: '#eab308',
                        fontSize: '8px',
                        fontWeight: 900,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <Lock size={10} /> {timeLeft}
                    </div>
                </div>
            )}

            {/* NFT IMAGE CONTAINER */}
            <div style={{
                aspectRatio: '1/1',
                background: '#000',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '12px',
                border: '1px solid rgba(255,255,255,0.05)',
                position: 'relative'
            }}>
                <img
                    src={nft.image}
                    alt=""
                    style={{
                        width: '100%',
                        height: '100%',
                        // FIXED: 'objectCover' is not a valid CSS property. Use 'objectFit'.
                        objectFit: 'cover',
                        opacity: isStaked ? 0.4 : 1,
                        filter: isStaked ? 'grayscale(100%)' : 'none',
                        transition: 'transform 0.5s ease'
                    }}
                />
                {isStaked && (
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(45deg, rgba(234,179,8,0.05) 0%, transparent 100%)' }} />
                )}
            </div>

            {/* INFO SECTION */}
            <p style={{ fontSize: '10px', fontWeight: 900, color: '#eab308', textTransform: 'uppercase', margin: '0 0 12px 0', letterSpacing: '1px' }}>
                {nft.name}
            </p>

            {isStaked ? (
                <button
                    onClick={handleUnstakeAction}
                    disabled={timeLeft !== "READY TO UNSTAKE" || isProcessing}
                    className="terminal-button"
                    style={{
                        width: '100%',
                        background: timeLeft === "READY TO UNSTAKE" ? '#22c55e' : 'rgba(255,255,255,0.05)',
                        color: timeLeft === "READY TO UNSTAKE" ? '#000' : 'rgba(255,255,255,0.2)',
                        border: 'none'
                    }}
                >
                    {isProcessing ? "PROCESSING..." : timeLeft === "READY TO UNSTAKE" ? "RELEASE ASSET" : "VAULT LOCKED"}
                </button>
            ) : (
                <button
                    onClick={handleStakeAction}
                    disabled={isProcessing}
                    className="terminal-button"
                    style={{ width: '100%', background: '#eab308', color: '#000' }}
                >
                    {isProcessing ? "INITIALIZING..." : "SECURE IN VAULT"}
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
            setNfts(res.data.nfts);
            setRawStakes(res.data.rawStakes);
        } catch (e) {
            console.error("Gallery Load Error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [publicKey]);

    if (!publicKey) return null;

    return (
        <div style={{ marginTop: '48px', maxWidth: '1200px', marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', padding: '0 10px' }}>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, fontStyle: 'italic', color: '#fff', textTransform: 'uppercase', margin: 0, letterSpacing: '2px' }}>
                        Asset <span style={{ color: '#eab308' }}>Inventory</span>
                    </h3>
                    <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontWeight: 900, textTransform: 'uppercase', marginTop: '4px' }}>
                        Detected Items: {nfts.length}
                    </p>
                </div>
                <button
                    onClick={loadData}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '5px' }}
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '80px 0', textAlign: 'center' }}>
                    {/* FIXED: Removed animatePulse from the style object. It should be in className. */}
                    <p className="terminal-desc animate-pulse" style={{ letterSpacing: '4px', fontSize: '10px' }}>
                        SYNCHRONIZING SECURE SECTOR...
                    </p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '20px'
                }}>
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