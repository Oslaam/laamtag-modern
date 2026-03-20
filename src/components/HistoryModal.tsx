import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { X, TrendingUp, Zap, Clock, Users } from 'lucide-react';
import styles from '../styles/HistoryModal.module.css';

type FilterType = 'ALL' | 'WINS' | 'COSTS' | 'STAKING' | 'NFT';
const FILTERS: FilterType[] = ['ALL', 'WINS', 'COSTS', 'STAKING', 'NFT'];

export default function HistoryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { publicKey } = useWallet();
    const [rawHistory, setRawHistory] = useState<any[]>([]);
    const [groupedHistory, setGroupedHistory] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

    useEffect(() => {
        if (isOpen && publicKey) {
            setLoading(true);
            fetch(`/api/user/rewards?walletAddress=${publicKey.toBase58()}`)
                .then(res => res.json())
                .then(data => {
                    setRawHistory(data.history || []);
                    setLoading(false);
                });
        }
    }, [isOpen, publicKey]);

    useEffect(() => {
        const filtered = rawHistory.filter(item => {
            if (item.asset === 'POINTS') return false;
            if (activeFilter === 'ALL') return true;
            if (activeFilter === 'COSTS') return item.type.includes('COST') || item.type.includes('FEE') || item.type.includes('LOSS') || item.type.includes('SPENT') || item.type.includes('ENTRY');
            if (activeFilter === 'WINS') return item.type.includes('WIN') || item.type.includes('REWARD') || item.type.includes('GAME') || item.type.includes('HUNTER');
            if (activeFilter === 'STAKING') return item.type.includes('STAKING');
            if (activeFilter === 'NFT') return item.type.includes('NFT');
            return true;
        });

        const groups = filtered.reduce((acc: any, item: any) => {
            const date = new Date(item.createdAt).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
            });
            if (!acc[date]) acc[date] = [];
            acc[date].push(item);
            return acc;
        }, {});

        setGroupedHistory(groups);
    }, [rawHistory, activeFilter]);

    if (!isOpen) return null;

    return (
        <div className={styles.backdrop}>
            <div className={styles.modal}>

                {/* ── HEADER ── */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2 className={styles.title}>Master Ledger</h2>
                        <p className={styles.titleSub}>TRANSACTION LOGS</p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={16} />
                    </button>
                </div>

                {/* ── FILTERS ── */}
                <div className={styles.filterBar}>
                    {FILTERS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveFilter(tab)}
                            className={`${styles.filterBtn} ${activeFilter === tab ? styles.filterBtnActive : ''}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* ── LIST ── */}
                <div className={styles.body}>
                    {loading ? (
                        <div className={styles.centerState}>
                            <p className={styles.loadingText}>DECRYPTING RECORDS...</p>
                        </div>
                    ) : Object.keys(groupedHistory).length === 0 ? (
                        <div className={styles.centerState}>
                            <p className={styles.emptyText}>NO RECORDS FOUND</p>
                        </div>
                    ) : (
                        Object.keys(groupedHistory).map(date => (
                            <div key={date} className={styles.dateGroup}>
                                <h3 className={styles.dateLabel}>{date}</h3>
                                <div className={styles.itemList}>
                                    {groupedHistory[date].map((item: any) => {
                                        const isCost = item.type.includes('COST') || item.type.includes('FEE') || item.type.includes('LOSS') || item.type.includes('ENTRY') || item.amount < 0;
                                        const isRecruit = item.type.includes('RECRUIT');
                                        const isGameWin = item.type.includes('GAME') || item.type.includes('HUNTER');

                                        const theme = isCost ? 'red'
                                            : isRecruit ? 'purple'
                                                : (isGameWin || item.asset === 'SKR') ? 'gold'
                                                    : 'green';

                                        const displayAmount = isCost
                                            ? `-${Math.abs(item.amount)}`
                                            : `+${Math.abs(item.amount)}`;

                                        return (
                                            <div key={item.id} className={styles.item}>
                                                <div className={styles.itemLeft}>
                                                    <div className={`${styles.itemIcon} ${styles[`icon_${theme}`]}`}>
                                                        {isRecruit
                                                            ? <Users size={14} />
                                                            : isCost
                                                                ? <Zap size={14} />
                                                                : <TrendingUp size={14} />}
                                                    </div>
                                                    <div className={styles.itemMeta}>
                                                        <span className={`${styles.itemType} ${styles[`type_${theme}`]}`}>
                                                            {item.type.split('_').join(' ')}
                                                        </span>
                                                        <p className={styles.itemLabel}>
                                                            {item.asset} {isCost ? 'EXPENSE' : 'INCOME'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={styles.itemRight}>
                                                    <span className={`${styles.itemAmount} ${styles[`amount_${theme}`]}`}>
                                                        {displayAmount}
                                                    </span>
                                                    <span className={styles.itemTime}>
                                                        <Clock size={7} />
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