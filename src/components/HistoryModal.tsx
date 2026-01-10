import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { X, TrendingUp, Zap, History } from 'lucide-react';

type FilterType = 'ALL' | 'WINS' | 'COSTS' | 'STAKING';

export default function HistoryModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { publicKey } = useWallet();
    const [rawHistory, setRawHistory] = useState<any[]>([]);
    const [groupedHistory, setGroupedHistory] = useState<any>({});
    const [stats, setStats] = useState({ todayEarned: 0, streak: 0 });
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

    useEffect(() => {
        if (isOpen && publicKey) {
            setLoading(true);
            fetch(`/api/user/rewards?walletAddress=${publicKey.toBase58()}`)
                .then(res => res.json())
                .then(data => {
                    setRawHistory(data.history || []);
                    setStats(data.stats || { todayEarned: 0, streak: 0 });
                    setLoading(false);
                });
        }
    }, [isOpen, publicKey]);

    useEffect(() => {
        const filtered = rawHistory.filter(item => {
            if (activeFilter === 'ALL') return true;
            if (activeFilter === 'WINS') return item.type.includes('WIN') || item.type.includes('REWARD');
            if (activeFilter === 'COSTS') return item.type.includes('COST');
            if (activeFilter === 'STAKING') return item.type.includes('STAKING');
            return true;
        });

        const groups = filtered.reduce((acc: any, item: any) => {
            const date = new Date(item.createdAt).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
            });
            if (!acc[date]) acc[date] = [];
            acc[date].push(item);
            return acc;
        }, {});

        setGroupedHistory(groups);
    }, [rawHistory, activeFilter]);

    if (!isOpen) return null;

    return (
        <div className="overlay" style={{ backdropFilter: 'blur(10px)', zIndex: 1000 }}>
            <div className="terminal-card" style={{
                width: '100%',
                maxWidth: '450px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>

                {/* HEADER SECTION */}
                <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h2 style={{ color: '#eab308', margin: 0, fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>
                                Master Ledger
                            </h2>
                            <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', margin: 0, fontWeight: 900 }}>LIVE SECTOR DATA</p>
                        </div>
                        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', padding: '8px', color: '#fff', cursor: 'pointer' }}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* MINI STATS GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ background: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.1)', padding: '12px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <TrendingUp size={10} color="#eab308" />
                                <span style={{ fontSize: '8px', fontWeight: 900, color: '#eab308', textTransform: 'uppercase' }}>Today</span>
                            </div>
                            <p style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>+{stats.todayEarned.toLocaleString()}</p>
                        </div>
                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <Zap size={10} color="#fff" />
                                <span style={{ fontSize: '8px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Streak</span>
                            </div>
                            <p style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>{stats.streak}D</p>
                        </div>
                    </div>

                    {/* FILTER TABS - Matching Games Selector Pattern */}
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {(['ALL', 'WINS', 'COSTS', 'STAKING'] as FilterType[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveFilter(tab)}
                                style={{
                                    flex: 1,
                                    background: activeFilter === tab ? '#eab308' : 'transparent',
                                    color: activeFilter === tab ? '#000' : 'rgba(255,255,255,0.4)',
                                    border: 'none',
                                    padding: '8px 0',
                                    borderRadius: '8px',
                                    fontSize: '8px',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* SCROLLABLE LIST */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <p className="terminal-desc animate-pulse">DECRYPTING RECORDS...</p>
                        </div>
                    ) : Object.keys(groupedHistory).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <p className="terminal-desc" style={{ fontSize: '10px' }}>NO RECORDS IN THIS SECTOR</p>
                        </div>
                    ) : (
                        Object.keys(groupedHistory).map((date) => (
                            <div key={date} style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(234,179,8,0.5)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px', borderLeft: '2px solid #eab308', paddingLeft: '8px' }}>
                                    {date}
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {groupedHistory[date].map((item: any) => (
                                        <div key={item.id} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '12px 16px',
                                            background: 'rgba(255,255,255,0.02)',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{
                                                    fontSize: '7px',
                                                    fontWeight: 900,
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    width: 'fit-content',
                                                    background: item.type.includes('WIN') ? 'rgba(34, 197, 94, 0.1)' : item.type.includes('COST') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                    color: item.type.includes('WIN') ? '#22c55e' : item.type.includes('COST') ? '#ef4444' : '#3b82f6'
                                                }}>
                                                    {item.type.replace('_', ' ')}
                                                </span>
                                                <p style={{ fontSize: '10px', fontWeight: 900, color: '#fff', margin: 0 }}>
                                                    {item.asset} {item.type.includes('COST') ? 'EXPENSE' : 'INCOME'}
                                                </p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{
                                                    fontSize: '13px',
                                                    fontWeight: 900,
                                                    fontStyle: 'italic',
                                                    margin: 0,
                                                    color: item.amount >= 0 ? '#22c55e' : '#ef4444'
                                                }}>
                                                    {item.amount >= 0 ? '+' : ''}{item.amount}
                                                </p>
                                                <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{item.asset}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}