import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useWallet } from '@solana/wallet-adapter-react';
import SeekerGuard from '../components/SeekerGuard';
import axios from 'axios';
import { Lock, Zap, Clock, History } from 'lucide-react';
import { stakeNftOnChain } from '../lib/stakeNftTask';

// The live ticker for rewards
const RewardTicker = ({ stakedAt }: { stakedAt: string }) => {
    const [rewards, setRewards] = useState({ laam: 0, tag: 0 });
    const LAAM_PER_SEC = 500 / 86400;
    const TAG_PER_SEC = 20 / 86400;

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const start = new Date(stakedAt).getTime();
            const secondsElapsed = Math.max(0, Math.floor((now - start) / 1000) - (48 * 3600));

            setRewards({
                laam: secondsElapsed * LAAM_PER_SEC,
                tag: secondsElapsed * TAG_PER_SEC
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [stakedAt]);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '12px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: 900 }}>LAAM ACCRUED</p>
                <p style={{ color: '#eab308', fontWeight: 900, fontSize: '14px', margin: 0, fontFamily: 'monospace' }}>{rewards.laam.toFixed(4)}</p>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: 900 }}>TAG ACCRUED</p>
                <p style={{ color: '#fff', fontWeight: 900, fontSize: '14px', margin: 0, fontFamily: 'monospace' }}>{rewards.tag.toFixed(4)}</p>
            </div>
        </div>
    );
};

export default function VaultPage() {
    const wallet = useWallet();
    const { publicKey } = wallet;
    const [nfts, setNfts] = useState<any[]>([]);
    const [rawStakes, setRawStakes] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [totalClaimed, setTotalClaimed] = useState({ laam: 0, tag: 0 });
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        if (!publicKey) return;
        try {
            await axios.post('/api/staking/sync', { walletAddress: publicKey.toBase58() });
            const [listRes, historyRes] = await Promise.all([
                axios.get(`/api/staking/list?address=${publicKey.toBase58()}`),
                axios.get(`/api/staking/history?address=${publicKey.toBase58()}`)
            ]);
            setNfts(listRes.data.nfts);
            setRawStakes(listRes.data.rawStakes || []);
            setTotalClaimed(historyRes.data.totals);
            setHistory(historyRes.data.history);
        } catch (err) {
            console.error("Staking load error", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [publicKey]);

    const handleAction = async (nft: any) => {
        setLoading(true);
        try {
            if (!nft.staked) {
                const result = await stakeNftOnChain(wallet, nft.mint);
                if (result.success) {
                    await axios.post('/api/staking/stake', {
                        walletAddress: publicKey?.toBase58(),
                        mintAddress: nft.mint,
                        signature: result.signature
                    });
                }
            } else {
                await axios.post('/api/staking/unstake', {
                    walletAddress: publicKey?.toBase58(),
                    mintAddress: nft.mint
                });
            }
            await loadData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Action failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SeekerGuard>
            <div className="main-content">
                <Head><title>LAAMTAG | Staking Arena</title></Head>
                <div className="content-wrapper">
                    
                    {/* HEADER */}
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h1 className="page-title">The <span style={{ color: '#eab308' }}>Vault</span></h1>
                        <p className="terminal-desc" style={{ fontSize: '10px' }}>PROTOCOL: ASSET_LOCK_V2</p>
                    </div>

                    {/* TOP STATS GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                        <div className="terminal-card" style={{ padding: '16px', textAlign: 'center' }}>
                            <Lock size={16} color="#eab308" style={{ margin: '0 auto 8px' }} />
                            <p style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>{nfts.filter(n => n.staked).length}</p>
                            <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 900 }}>LOCKED ASSETS</p>
                        </div>
                        <div className="terminal-card" style={{ padding: '16px', textAlign: 'center' }}>
                            <Zap size={16} color="#a855f7" style={{ margin: '0 auto 8px' }} />
                            <p style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>{totalClaimed.laam.toFixed(0)}</p>
                            <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 900 }}>TOTAL LAAM EARNED</p>
                        </div>
                    </div>

                    {/* NFT LIST */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {nfts.map((nft) => {
                            const stakeData = rawStakes.find(s => s.mintAddress === nft.mint);
                            return (
                                <div key={nft.mint} className="terminal-card" style={{ padding: '12px' }}>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        <div style={{ width: '80px', height: '80px', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
                                            <img src={nft.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: nft.staked ? 0.5 : 1 }} />
                                            {nft.staked && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={20} color="#eab308" /></div>}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '14px', fontWeight: 900, margin: 0 }}>{nft.name}</h3>
                                            {nft.staked && stakeData ? <RewardTicker stakedAt={stakeData.stakedAt} /> : <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>READY TO LOCK</p>}
                                        </div>
                                    </div>
                                    <button
                                        disabled={loading}
                                        onClick={() => handleAction(nft)}
                                        className="primary-btn"
                                        style={{ marginTop: '12px', padding: '10px', fontSize: '11px', background: nft.staked ? 'rgba(255,255,255,0.05)' : '#eab308', color: nft.staked ? '#fff' : '#000' }}
                                    >
                                        {loading ? "PROCESING..." : nft.staked ? "UNLOCK & CLAIM" : "LOCK ASSET"}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* HISTORY TABLE */}
                    <div className="terminal-card" style={{ marginTop: '40px', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <History size={16} color="#eab308" />
                            <h2 style={{ fontSize: '12px', fontWeight: 900, margin: 0 }}>RECENT ACTIVITY</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {history.slice(0, 5).map((item) => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                                    <span style={{ opacity: 0.5 }}>{new Date(item.unstakedAt).toLocaleDateString()}</span>
                                    <span style={{ fontWeight: 900, color: '#eab308' }}>+{item.laamEarned.toFixed(0)} LAAM</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </SeekerGuard>
    );
}