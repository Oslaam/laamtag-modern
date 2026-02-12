import { useEffect, useState } from 'react';
import { Zap, Gift, Users, Trophy, ShoppingCart, ArrowUpRight, RefreshCcw, Hammer } from 'lucide-react';
import styles from '../styles/ActivityTicker.module.css';

export default function ActivityTicker() {
    const [activities, setActivities] = useState<any[]>([]);

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                const res = await fetch('/api/user/activity-ticker');
                const data = await res.json();
                if (Array.isArray(data)) setActivities(data);
            } catch (err) {
                console.error("Ticker fetch failed", err);
            }
        };

        fetchFeed();
        const interval = setInterval(fetchFeed, 30000);
        return () => clearInterval(interval);
    }, []);

    const getIcon = (type: string) => {
        const t = type.toUpperCase();
        if (t.includes('MINT')) return <Hammer size={12} className="text-pink-400" />;
        if (t.includes('RECRUIT')) return <Users size={12} className="text-purple-400" />;
        if (t.includes('SPIN') || t.includes('WIN')) return <Trophy size={12} className="text-yellow-400" />;
        if (t.includes('CLAIM') || t.includes('LOOT')) return <Gift size={12} className="text-green-400" />;
        if (t.includes('PURCHASE') || t.includes('BUY') || t.includes('SHOP')) return <ShoppingCart size={12} className="text-orange-400" />;
        if (t.includes('SWAP')) return <RefreshCcw size={12} className="text-blue-400" />;
        if (t.includes('WITHDRAW')) return <ArrowUpRight size={12} className="text-red-400" />;
        return <Zap size={12} className="text-yellow-500" />;
    };

    const formatWallet = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`;

    if (activities.length === 0) return null;

    return (
        <div className={styles.tickerContainer}>
            <div className={styles.tickerContent}>
                {[...activities, ...activities].map((act, i) => {
                    const isExpense = act.amount < 0 ||
                        act.type.includes('COST') ||
                        act.type.includes('PURCHASE') ||
                        act.type.includes('WITHDRAW');

                    return (
                        <div key={i} className={styles.tickerItem}>
                            {getIcon(act.type)}
                            <span className={styles.wallet}>{formatWallet(act.userId)}</span>
                            <span className={styles.action}>
                                {act.type.replace(/_/g, ' ')}
                            </span>
                            <span className={isExpense ? styles.amountNegative : styles.amountPositive}>
                                {act.amount > 0 ? `+${act.amount}` : act.amount} {act.asset}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}