import { useEffect, useState } from 'react';
import { Zap, Gift, Users, Trophy, ShoppingCart, ArrowUpRight, RefreshCcw, Hammer, Wifi } from 'lucide-react';
import io from 'socket.io-client';
import styles from '../styles/ActivityTicker.module.css';

let socket: any;

export default function ActivityTicker() {
    const [activities, setActivities] = useState<any[]>([]);

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                const res = await fetch('/api/user/activity-ticker');
                const data = await res.json();
                if (Array.isArray(data)) setActivities(data);
            } catch (err) {
                console.error('Ticker fetch failed', err);
            }
        };

        fetchFeed();
        const interval = setInterval(fetchFeed, 30000);
        return () => {
            clearInterval(interval);
            if (socket) socket.disconnect();
        };
    }, []);

    const getIcon = (type: string) => {
        const t = type.toUpperCase();
        if (t.includes('GAME') || t.includes('HUNTER')) return <Trophy size={11} className={styles.iconGold} />;
        if (t.includes('SYSTEM')) return <Wifi size={11} className={styles.iconGreen} />;
        if (t.includes('MINT')) return <Hammer size={11} className={styles.iconPink} />;
        if (t.includes('RECRUIT')) return <Users size={11} className={styles.iconPurple} />;
        if (t.includes('SPIN') || t.includes('WIN')) return <Trophy size={11} className={styles.iconGold} />;
        if (t.includes('CLAIM') || t.includes('LOOT')) return <Gift size={11} className={styles.iconGreen} />;
        if (t.includes('PURCHASE') || t.includes('BUY') || t.includes('SHOP')) return <ShoppingCart size={11} className={styles.iconOrange} />;
        if (t.includes('SWAP')) return <RefreshCcw size={11} className={styles.iconBlue} />;
        if (t.includes('WITHDRAW')) return <ArrowUpRight size={11} className={styles.iconRed} />;
        return <Zap size={11} className={styles.iconGold} />;
    };

    const formatDisplayName = (address: string, username?: string) => {
        if (address === '0xSystem') return 'SYSTEM';
        if (username) return username;
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    if (activities.length === 0) return null;

    return (
        <div className={styles.tickerContainer}>
            <div className={styles.liveTag}>LIVE</div>
            <div className={styles.tickerTrack}>
                <div className={styles.tickerContent}>
                    {[...activities, ...activities].map((act, i) => {
                        const isBadge = act.type === 'BADGE_CLAIM';
                        const isSystem = act.type.includes('SYSTEM');
                        const isExpense = act.amount < 0 || act.type.includes('COST') || act.type.includes('PURCHASE') || act.type.includes('WITHDRAW');

                        const displayName = formatDisplayName(act.userId, act.username);

                        const nameClass = (isBadge || act.type.includes('WIN') || act.type.includes('GAME'))
                            ? styles.nameGold
                            : act.username?.includes('.laam')
                                ? styles.nameGold
                                : act.username?.includes('.skr')
                                    ? styles.nameCyan
                                    : styles.nameWhite;

                        const amountClass = isBadge
                            ? styles.amountBadge
                            : isSystem
                                ? styles.amountSystem
                                : isExpense
                                    ? styles.amountNeg
                                    : styles.amountPos;

                        return (
                            <div
                                key={`${act.id}-${i}`}
                                className={`${styles.tickerItem} ${act.isLive ? styles.livePulse : ''}`}
                            >
                                <span className={styles.iconWrap}>{getIcon(act.type)}</span>

                                <span className={`${styles.name} ${nameClass} ${act.username ? styles.nameUser : styles.nameWallet}`}>
                                    {displayName}
                                </span>

                                <span className={styles.action}>
                                    {isBadge ? 'UNLOCKED' : act.type.replace(/_/g, ' ')}
                                </span>

                                <span className={`${styles.amount} ${amountClass}`}>
                                    {isBadge
                                        ? `+1 ${act.asset}`
                                        : isSystem
                                            ? `v.${act.amount}`
                                            : `${act.amount > 0 ? '+' : ''}${act.amount} ${act.asset}`}
                                </span>

                                <span className={styles.sep}>·</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}