import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { RefreshCw, ShieldAlert } from 'lucide-react';

export default function WarriorGallery() {
    const { publicKey } = useWallet();
    const [warriors, setWarriors] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Step 1: Prevent Server-Side Rendering crashes during build
    useEffect(() => {
        setMounted(true);
    }, []);

    const loadWarriors = async () => {
        if (!publicKey) return;
        setLoading(true);
        try {
            const res = await axios.get(`/api/collectable/warrior-list?address=${publicKey.toBase58()}`);
            const nftArray = res.data?.nfts || [];
            setWarriors(nftArray);

            // SELF-HEALING LOGIC
            await axios.post('/api/user/update-mints', {
                walletAddress: publicKey.toBase58(),
                actualCount: nftArray.length
            });
        } catch (e) {
            console.error("Warrior Load Error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mounted && publicKey) {
            loadWarriors();
        }
    }, [publicKey, mounted]);

    // Don't render anything until mounted or if no wallet is connected
    if (!mounted || !publicKey) return null;

    return (
        <div style={{ marginTop: '48px', maxWidth: '1200px', marginLeft: 'auto', marginRight: 'auto', padding: '0 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, fontStyle: 'italic', color: '#fff', textTransform: 'uppercase', margin: 0, letterSpacing: '2px' }}>
                        Neural <span style={{ color: '#22d3ee' }}>Warriors</span>
                    </h3>
                    <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontWeight: 900, textTransform: 'uppercase', marginTop: '4px' }}>
                        {/* Step 2: Use optional chaining + fallback to 0 */}
                        Verified Combatants: {warriors?.length || 0}
                    </p>
                </div>
                <button
                    onClick={loadWarriors}
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
            ) : (!warriors || warriors.length === 0) ? (
                <div style={{
                    padding: '40px',
                    background: 'rgba(34, 211, 238, 0.02)',
                    border: '1px dashed rgba(34, 211, 238, 0.2)',
                    borderRadius: '16px',
                    textAlign: 'center'
                }}>
                    <ShieldAlert size={24} color="rgba(34, 211, 238, 0.2)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        No Warriors found in this wallet.
                    </p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '16px'
                }}>
                    {/* Step 3: Ensure map always has an array fallback */}
                    {(warriors || []).map((nft) => (
                        <div key={nft.mint} className="terminal-card" style={{
                            padding: '10px',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(34, 211, 238, 0.2)'
                        }}>
                            <div style={{ aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' }}>
                                <img
                                    src={nft.image}
                                    alt={nft.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                            <p style={{ fontSize: '10px', fontWeight: 900, color: '#22d3ee', textTransform: 'uppercase', margin: 0, textAlign: 'center' }}>
                                {nft.name}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}