import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { Coins, Loader2, Database, ShieldCheck } from 'lucide-react';

export default function LootVault() {
    const { publicKey } = useWallet();
    const [pending, setPending] = useState({ sol: 0, usdc: 0 });
    const [claiming, setClaiming] = useState<'SOL' | 'USDC' | null>(null);

    const fetchLoot = async () => {
        if (!publicKey) return;
        try {
            const res = await axios.get(`/api/user/pending-loot?address=${publicKey.toBase58()}`);
            const rewards = res.data.rewards;

            const solTotal = rewards.filter((r: any) => r.asset === 'SOL').reduce((a: number, b: any) => a + b.amount, 0);
            const usdcTotal = rewards.filter((r: any) => r.asset === 'USDC').reduce((a: number, b: any) => a + b.amount, 0);

            setPending({ sol: solTotal, usdc: usdcTotal });
        } catch (err) {
            console.error("Failed to fetch loot", err);
        }
    };

    useEffect(() => { fetchLoot(); }, [publicKey]);

    const handleClaim = async (assetType: 'SOL' | 'USDC') => {
        if (!publicKey) return;
        setClaiming(assetType);
        try {
            const res = await axios.post('/api/user/claim-rewards', {
                walletAddress: publicKey.toBase58(),
                assetType: assetType
            });
            // Using a simple alert for now to match your previous logic, but styled for the future
            alert(res.data.message);
            fetchLoot();
        } catch (err: any) {
            alert(err.response?.data?.message || "Claim failed");
        } finally {
            setClaiming(null);
        }
    };

    if (!publicKey) return null;

    return (
        <div className="terminal-card" style={{ marginTop: '32px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ color: '#eab308', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <Database size={18} /> Loot Vault
                    </h2>
                    <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontWeight: 900, marginTop: '4px', textTransform: 'uppercase' }}>
                        Secure Asset Retrieval Protocol
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34, 197, 94, 0.1)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <ShieldCheck size={10} color="#22c55e" />
                    <span style={{ fontSize: '8px', fontWeight: 900, color: '#22c55e', textTransform: 'uppercase' }}>Vault Online</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                {/* SOL ASSET */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Available SOL</p>
                    <p style={{ fontSize: '24px', fontWeight: 900, color: '#fff', margin: '0 0 20px 0', fontStyle: 'italic' }}>
                        {pending.sol.toFixed(3)} <span style={{ fontSize: '10px', fontStyle: 'normal', color: 'rgba(255,255,255,0.3)' }}>SOL</span>
                    </p>
                    <button
                        disabled={pending.sol <= 0 || claiming !== null}
                        onClick={() => handleClaim('SOL')}
                        className="terminal-button"
                        style={{
                            width: '100%',
                            background: pending.sol > 0 ? '#eab308' : 'rgba(255,255,255,0.05)',
                            color: pending.sol > 0 ? '#000' : 'rgba(255,255,255,0.2)',
                            opacity: (pending.sol <= 0 || claiming !== null) ? 0.5 : 1
                        }}
                    >
                        {claiming === 'SOL' ? <Loader2 className="animate-spin" size={14} /> : "EXECUTE CLAIM"}
                    </button>
                </div>

                {/* USDC ASSET */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Available USDC</p>
                    <p style={{ fontSize: '24px', fontWeight: 900, color: '#3b82f6', margin: '0 0 20px 0', fontStyle: 'italic' }}>
                        ${pending.usdc.toFixed(2)}
                    </p>
                    <button
                        disabled={pending.usdc <= 0 || claiming !== null}
                        onClick={() => handleClaim('USDC')}
                        className="terminal-button"
                        style={{
                            width: '100%',
                            background: pending.usdc > 0 ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                            color: pending.usdc > 0 ? '#fff' : 'rgba(255,255,255,0.2)',
                            opacity: (pending.usdc <= 0 || claiming !== null) ? 0.5 : 1
                        }}
                    >
                        {claiming === 'USDC' ? <Loader2 className="animate-spin" size={14} /> : "EXECUTE CLAIM"}
                    </button>
                </div>
            </div>
        </div>
    );
}