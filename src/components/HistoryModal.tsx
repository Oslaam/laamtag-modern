import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { X, TrendingUp, Zap, History, Clock, Users } from 'lucide-react';

type FilterType = 'ALL' | 'WINS' | 'COSTS' | 'STAKING' | 'NFT';

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
            // GLOBAL RULE: Never show game points in history
            if (item.asset === 'POINTS') return false;

            if (activeFilter === 'ALL') return true;

            if (activeFilter === 'COSTS') {
                return item.type.includes('COST') ||
                    item.type.includes('FEE') ||
                    item.type.includes('LOSS') ||
                    item.type.includes('SPENT') ||
                    item.type.includes('ENTRY');
            }

            if (activeFilter === 'WINS') {
                return item.type.includes('WIN') || item.type.includes('REWARD');
            }

            if (activeFilter === 'STAKING') return item.type.includes('STAKING');
            if (activeFilter === 'NFT') return item.type.includes('NFT');
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
                {/* HEADER */}
                <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h2 style={{ color: '#eab308', margin: 0, fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>
                                Master Ledger
                            </h2>
                            <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', margin: 0, fontWeight: 900 }}>TRANSACTION LOGS</p>
                        </div>
                        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', padding: '8px', color: '#fff', cursor: 'pointer' }}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* FILTER TABS */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '4px',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '4px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        {(['ALL', 'WINS', 'COSTS', 'STAKING', 'NFT'] as FilterType[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveFilter(tab)}
                                style={{
                                    background: activeFilter === tab ? '#eab308' : 'transparent',
                                    color: activeFilter === tab ? '#000' : 'rgba(255,255,255,0.4)',
                                    border: 'none',
                                    padding: '8px 0',
                                    borderRadius: '8px',
                                    fontSize: '7px',
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
                            <p className="terminal-desc" style={{ fontSize: '10px' }}>NO RECORDS FOUND</p>
                        </div>
                    ) : (
                        Object.keys(groupedHistory).map((date) => (
                            <div key={date} style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(234,179,8,0.5)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px', borderLeft: '2px solid #eab308', paddingLeft: '8px' }}>
                                    {date}
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {groupedHistory[date].map((item: any) => {
                                        const isCost = item.type.includes('COST') || item.type.includes('FEE') || item.type.includes('LOSS') || item.type.includes('ENTRY') || item.amount < 0;
                                        const isRecruit = item.type.includes('RECRUIT'); // Check for Recruit Reward

                                        const themeColor = isCost ? '#ef4444' : (isRecruit ? '#8b5cf6' : '#22c55e'); // Purple for Recruit
                                        const bgColor = isCost ? 'rgba(239, 68, 68, 0.1)' : (isRecruit ? 'rgba(139, 92, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)');
                                        const displayAmount = isCost ? `-${Math.abs(item.amount)}` : `+${Math.abs(item.amount)}`;

                                        return (
                                            <div key={item.id} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '12px 16px',
                                                background: 'rgba(255,255,255,0.02)',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255,255,255,0.05)'
                                            }}>
                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                    {/* ICON SECTION */}
                                                    <div style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '8px',
                                                        background: bgColor,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: themeColor
                                                    }}>
                                                        {isRecruit ? <Users size={16} /> : (isCost ? <Zap size={16} /> : <TrendingUp size={16} />)}
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{
                                                                fontSize: '7px',
                                                                fontWeight: 900,
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                background: item.asset === 'SKR' ? 'rgba(234, 179, 8, 0.1)' : bgColor,
                                                                color: item.asset === 'SKR' ? '#eab308' : themeColor,
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                {item.type.split('_').join(' ')}
                                                            </span>
                                                        </div>
                                                        <p style={{ fontSize: '10px', fontWeight: 900, color: '#fff', margin: 0 }}>
                                                            {item.asset} {isCost ? 'EXPENSE' : 'INCOME'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontSize: '13px', fontWeight: 900, margin: 0, color: themeColor }}>
                                                        {displayAmount}
                                                    </p>
                                                    <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                                                        <Clock size={8} />
                                                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}