import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-[2.5rem] overflow-hidden flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(0,0,0,1)]">

                {/* Header & Stats Section */}
                <div className="p-6 border-b border-white/5 bg-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-white font-black uppercase italic tracking-widest text-lg">Master Ledger</h2>
                            <p className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Live Sector Data</p>
                        </div>
                        <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                            <span className="text-white text-xs font-black px-2">X</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Daily Earnings Card */}
                        <div className="bg-gradient-to-br from-yellow-500/20 to-transparent border border-yellow-500/20 rounded-2xl p-3">
                            <p className="text-[7px] font-black text-yellow-500 uppercase tracking-widest mb-1">Today's Earnings</p>
                            <p className="text-xl font-black text-white italic">
                                +{stats.todayEarned.toLocaleString()} <span className="text-[10px] not-italic text-gray-400">LAAM</span>
                            </p>
                        </div>

                        {/* Streak Card */}
                        <div className="bg-gradient-to-br from-orange-500/20 to-transparent border border-orange-500/20 rounded-2xl p-3">
                            <p className="text-[7px] font-black text-orange-500 uppercase tracking-widest mb-1">Earning Streak</p>
                            <p className="text-xl font-black text-white italic">
                                {stats.streak} <span className="text-[10px] not-italic text-gray-400">DAYS</span>
                            </p>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                        {(['ALL', 'WINS', 'COSTS', 'STAKING'] as FilterType[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveFilter(tab)}
                                className={`flex-1 text-[8px] font-black py-2 rounded-lg transition-all tracking-tighter ${activeFilter === tab
                                        ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                                        : 'text-gray-500 hover:text-white'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-20 space-y-4">
                            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-gray-600 text-[10px] uppercase font-black animate-pulse">Decrypting Records...</p>
                        </div>
                    ) : Object.keys(groupedHistory).length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-gray-600 text-[10px] uppercase font-black italic">No records in this sector</p>
                        </div>
                    ) : (
                        Object.keys(groupedHistory).map((date) => (
                            <div key={date} className="space-y-2">
                                <h3 className="text-[9px] font-black text-yellow-500/50 uppercase tracking-[0.2em] pl-2 border-l border-yellow-500/20">{date}</h3>
                                {groupedHistory[date].map((item: any) => (
                                    <div key={item.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-[7px] font-black px-2 py-0.5 rounded-full w-fit ${item.type.includes('WIN') || item.type.includes('REWARD') ? 'bg-green-500/20 text-green-500' :
                                                    item.type.includes('COST') ? 'bg-red-500/20 text-red-500' :
                                                        'bg-blue-500/20 text-blue-500'
                                                }`}>
                                                {item.type.replace('_', ' ')}
                                            </span>
                                            <p className="text-[10px] font-black text-white uppercase tracking-tighter">
                                                {item.asset} {item.type.includes('COST') ? 'EXPENSE' : 'INCOME'}
                                            </p>
                                            <p className="text-[8px] text-gray-500 font-bold uppercase">
                                                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-black italic ${item.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {item.amount >= 0 ? '+' : ''}{item.amount} <span className="text-[10px]">{item.asset}</span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}