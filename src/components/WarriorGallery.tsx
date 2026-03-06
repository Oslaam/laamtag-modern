import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { RefreshCw, ShieldAlert, Rocket } from 'lucide-react';

export default function WarriorGallery() {
    const { publicKey } = useWallet();
    const [walletWarriors, setWalletWarriors] = useState<any[]>([]);
    const [deployedWarriors, setDeployedWarriors] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    const COLLECTION_IMAGE = "https://gateway.pinata.cloud/ipfs/QmWLfNnKrFyyCQ35TouqiuNFE3Aq5rdQigZ4rtKC1M9wZ1/collection.png";

    useEffect(() => {
        setMounted(true);
    }, []);

    const loadAllWarriors = async () => {
        if (!publicKey) return;
        setLoading(true);
        try {
            // 1. Fetch NFTs currently in the wallet
            const walletRes = await axios.get(`/api/collectable/warrior-list?address=${publicKey.toBase58()}`);
            const nftArray = walletRes.data?.nfts || [];
            setWalletWarriors(nftArray);

            // 2. Fetch Warriors already in the BattleField/Barracks
            const barracksRes = await fetch(`/api/warriors/deployed?address=${publicKey.toBase58()}`);
            const barracksData = await barracksRes.json();
            setDeployedWarriors(barracksData || []);

            // Self-healing/Sync Logic
            await axios.post('/api/user/update-mints', {
                walletAddress: publicKey.toBase58(),
                actualCount: nftArray.length + (barracksData?.length || 0),
                type: 'warrior'
            });
        } catch (e) {
            console.error("Warrior Load Error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mounted && publicKey) {
            loadAllWarriors();
        }
    }, [publicKey, mounted]);

    if (!mounted || !publicKey) return null;

    return (
        <div style={{ marginTop: '48px', maxWidth: '1200px', marginLeft: 'auto', marginRight: 'auto', padding: '0 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, fontStyle: 'italic', color: '#fff', textTransform: 'uppercase', margin: 0, letterSpacing: '2px' }}>
                        Neural <span style={{ color: '#22d3ee' }}>Warriors</span>
                    </h3>
                    <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontWeight: 900, textTransform: 'uppercase', marginTop: '4px' }}>
                        Total Force: {walletWarriors.length + deployedWarriors.length} Units Detected
                    </p>
                </div>
                <button
                    onClick={loadAllWarriors}
                    disabled={loading}
                    style={{ background: 'none', border: 'none', color: 'rgba(34, 211, 238, 0.4)', cursor: 'pointer', padding: '5px' }}
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                    <p className="animate-pulse" style={{ color: '#22d3ee', letterSpacing: '4px', fontSize: '10px', fontWeight: 900 }}>
                        SCANNING BIOMETRIC SIGNATURES...
                    </p>
                </div>
            ) : (walletWarriors.length === 0 && deployedWarriors.length === 0) ? (
                <div style={{
                    padding: '40px',
                    background: 'rgba(34, 211, 238, 0.02)',
                    border: '1px dashed rgba(34, 211, 238, 0.2)',
                    borderRadius: '16px',
                    textAlign: 'center'
                }}>
                    <ShieldAlert size={24} color="rgba(34, 211, 238, 0.2)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        No Combatants detected in sectors.
                    </p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '16px'
                }}>
                    {/* RENDER DEPLOYED WARRIORS (STAKED) */}
                    {deployedWarriors.map((w) => (
                        <div key={w.mintAddress} style={{
                            padding: '10px',
                            background: 'rgba(34, 211, 238, 0.05)',
                            border: '1px solid rgba(34, 211, 238, 0.4)',
                            position: 'relative'
                        }}>
                            {/* Deployed Badge */}
                            <div style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                zIndex: 2,
                                background: '#22d3ee',
                                color: '#000',
                                padding: '2px 6px',
                                fontSize: '8px',
                                fontWeight: 900,
                                borderRadius: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                            }}>
                                <Rocket size={8} /> DEPLOYED
                            </div>

                            <div style={{ aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px', filter: 'grayscale(0.6) contrast(1.2)' }}>
                                <img
                                    src={w.image || COLLECTION_IMAGE}
                                    alt="Deployed Warrior"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                            <p style={{ fontSize: '10px', fontWeight: 900, color: '#22d3ee', textTransform: 'uppercase', margin: 0, textAlign: 'center' }}>
                                {w.rarity} UNIT
                            </p>
                        </div>
                    ))}

                    {/* RENDER WALLET WARRIORS (NOT STAKED) */}
                    {walletWarriors.map((nft) => (
                        <div key={nft.mint} style={{
                            padding: '10px',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(34, 211, 238, 0.2)'
                        }}>
                            <div style={{ aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' }}>
                                <img
                                    src={nft.image || COLLECTION_IMAGE}
                                    alt={nft.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                            <p style={{ fontSize: '10px', fontWeight: 900, color: '#fff', textTransform: 'uppercase', margin: 0, textAlign: 'center' }}>
                                {nft.name}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}