import { useEffect, useState } from 'react';
import { Zap, Gift, Users, Trophy, ShoppingCart, ArrowUpRight, RefreshCcw, Hammer, Wifi } from 'lucide-react';
import io from 'socket.io-client';
import styles from '../styles/ActivityTicker.module.css';

let socket: any;

export default function ActivityTicker() {
    const [activities, setActivities] = useState<any[]>([]);

    useEffect(() => {
        // 1. Initial Data Fetch
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

        // 2. Real-time Connection Listener
        // socketInitializer();

        return () => {
            clearInterval(interval);
            if (socket) socket.disconnect();
        };
    }, []);

    const socketInitializer = async () => {
        await fetch('/api/socket');
        socket = io({ path: '/api/socket' });

        socket.on('user-count-update', (count: number) => {
            const liveEvent = {
                id: `live-${Date.now()}`,
                type: 'SYSTEM_NODE_JOINED',
                userId: '0xSystem',
                amount: count,
                asset: 'ACTIVE_NODES',
                isLive: true
            };

            setActivities(prev => [liveEvent, ...prev.slice(0, 19)]);
        });
    };

    const getIcon = (type: string) => {
        const t = type.toUpperCase();

        // Check for Games first so they get the bounce!
        if (t.includes('GAME') || t.includes('HUNTER')) return <Trophy size={12} className="text-yellow-500 animate-bounce" />;

        if (t.includes('SYSTEM')) return <Wifi size={12} className="text-green-500 animate-pulse" />;
        if (t.includes('MINT')) return <Hammer size={12} className="text-pink-400" />;
        if (t.includes('RECRUIT')) return <Users size={12} className="text-purple-400" />;
        if (t.includes('SPIN') || t.includes('WIN')) return <Trophy size={12} className="text-yellow-400" />;
        if (t.includes('CLAIM') || t.includes('LOOT')) return <Gift size={12} className="text-green-400" />;
        if (t.includes('PURCHASE') || t.includes('BUY') || t.includes('SHOP')) return <ShoppingCart size={12} className="text-orange-400" />;
        if (t.includes('SWAP')) return <RefreshCcw size={12} className="text-blue-400" />;
        if (t.includes('WITHDRAW')) return <ArrowUpRight size={12} className="text-red-400" />;

        return <Zap size={12} className="text-yellow-500" />;
    };

    const formatDisplayName = (address: string, username?: string) => {
        if (address === '0xSystem') return 'SYSTEM';
        if (username) return username;
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    if (activities.length === 0) return null;

    return (
        <div className={styles.tickerContainer}>
            <div className={styles.tickerContent}>
                {[...activities, ...activities].map((act, i) => {
                    const isBadge = act.type === 'BADGE_CLAIM';
                    const isSystem = act.type.includes('SYSTEM');
                    const isExpense = act.amount < 0 ||
                        act.type.includes('COST') ||
                        act.type.includes('PURCHASE') ||
                        act.type.includes('WITHDRAW');

                    const displayName = formatDisplayName(act.userId, act.username);

                    // Colors: .laam = Gold, .skr = Cyan, default = white
                    const nameColor = (isBadge || act.type.includes('WIN') || act.type.includes('GAME'))
                        ? '#eab308'
                        : act.username?.includes('.laam')
                            ? '#eab308'
                            : act.username?.includes('.skr')
                                ? '#22d3ee'
                                : '#fff';

                    return (
                        <div key={`${act.id}-${i}`} className={`${styles.tickerItem} ${act.isLive ? styles.livePulse : ''}`}>
                            {getIcon(act.type)}

                            <span
                                className={styles.wallet}
                                style={{
                                    color: nameColor,
                                    fontWeight: act.username ? 800 : 400,
                                    textTransform: act.username ? 'lowercase' : 'uppercase'
                                }}
                            >
                                {displayName}
                            </span>

                            {/* Middle Text: shows "unlocked" for badges, otherwise normal type */}
                            <span className={styles.action}>
                                {isBadge ? 'unlocked' : act.type.replace(/_/g, ' ')}
                            </span>

                            {/* Right Text: shows "+1 BADGE" for badges, otherwise normal amount */}
                            <span className={isBadge ? 'text-yellow-500 font-black' : (isSystem ? 'text-green-500 font-black' : (isExpense ? styles.amountNegative : styles.amountPositive))}>
                                {isBadge
                                    ? `+1 ${act.asset}`
                                    : isSystem ? `v.${act.amount}` : `${act.amount > 0 ? '+' : ''}${act.amount} ${act.asset}`
                                }
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}