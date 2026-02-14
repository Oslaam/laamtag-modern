import type { AppProps } from 'next/app';
import Head from 'next/head';
import { FC, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ContextProvider } from '../contexts/ContextProvider';
import RankUpModal from '../components/RankUpModal';
import HistoryModal from '../components/HistoryModal';
import ActivityTicker from '../components/ActivityTicker';
import { useRankWatcher } from '../hooks/useRankWatcher';
import dynamic from 'next/dynamic';
import { getRank } from '../utils/ranks';
import {
    Hammer, Trophy, Layers, Gamepad2, ShoppingCart,
    FileText, User, BarChart3, Mail, History, Coins, ScrollText, Plus, X,
    DoorClosed, Crown, Repeat, Swords
} from 'lucide-react';

import '@solana/wallet-adapter-react-ui/styles.css';
import '../styles/globals.css';

const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

const ADMIN_WALLETS = [
    "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc",
    "E4cHwRYWTznNjTvchSkZVXH8LWqdWbLekVXWjzmite6M"
];

interface FooterItem {
    name: string;
    icon: ReactNode;
    type: 'link' | 'action';
    path?: string;
    action?: 'history' | 'toggle';
    highlight?: boolean;
}

const GlobalLayout: FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;
    return <InnerLayout>{children}</InnerLayout>;
};

const InnerLayout: FC<{ children: React.ReactNode }> = ({ children }) => {
    const { publicKey } = useWallet();
    const { connection } = useConnection();
    const router = useRouter();
    const { showRankModal, setShowRankModal, newRank } = useRankWatcher();

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const [stats, setStats] = useState({
        laam: 0,
        tag: 0,
        sol: 0,
        tier: 'BRONZE',
        username: '',
        currentStage: 1,
        weaponLevel: 1
    });
    const [pendingCount, setPendingCount] = useState(0);

    const isGamePage = router.pathname.includes('/games/shooter');
    const isAdmin = publicKey && ADMIN_WALLETS.includes(publicKey.toString());

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('SW Registered:', reg.scope))
                    .catch(err => console.error('SW Registration failed:', err));
            });
        }
    }, []);

    const fetchStats = useCallback(async () => {
        if (!publicKey || !connection) {
            setStats({ laam: 0, tag: 0, sol: 0, tier: 'BRONZE', username: '', currentStage: 1, weaponLevel: 1 });
            return;
        };

        try {
            if (isAdmin) {
                const tRes = await fetch('/api/admin/tickets', {
                    headers: { 'x-admin-wallet': publicKey.toString() }
                });
                if (tRes.ok) {
                    const tData = await tRes.json();
                    const count = tData.filter((t: any) => t.status === 'Pending').length;
                    setPendingCount(count);
                }
            }

            const solBalance = await connection.getBalance(publicKey);
            const res = await fetch(`/api/user/${publicKey.toString()}`);

            if (res.ok) {
                const data = await res.json();
                const currentPoints = data.laamPoints || 0;
                const rankData = getRank(currentPoints);

                setStats({
                    laam: currentPoints,
                    tag: data.tagTickets || 0,
                    sol: solBalance / LAMPORTS_PER_SOL,
                    tier: rankData.name.toUpperCase(),
                    username: data.username || '',
                    currentStage: data.currentStage || 1,
                    weaponLevel: data.weaponLevel || 1
                });
            }
        } catch (err) {
            console.warn("Network hiccup: Could not refresh stats.");
        }
    }, [publicKey, connection, isAdmin]);

    useEffect(() => {
        fetchStats();
        const handleBalanceUpdate = () => fetchStats();
        window.addEventListener('balanceUpdate', handleBalanceUpdate);
        const intervalId = setInterval(fetchStats, 30000);

        return () => {
            window.removeEventListener('balanceUpdate', handleBalanceUpdate);
            clearInterval(intervalId);
        };
    }, [publicKey, connection, fetchStats]);

    const allContentItems: FooterItem[] = [
        { name: 'Mint', icon: <Coins size={20} color="#eab308" />, path: '/mint', type: 'link' },
        { name: 'Quests', icon: <ScrollText size={20} color="#60a5fa" />, path: '/quests', type: 'link' },
        { name: 'Vault', icon: <Layers size={20} color="#a855f7" />, path: '/vault', type: 'link' },
        { name: 'Games', icon: <Gamepad2 size={20} color="#f43f5e" />, path: '/games', type: 'link' },
        { name: 'Arena', icon: <Swords size={20} color="#9f3e99" />, path: '/arena', type: 'link' },
        { name: 'Shop', icon: <ShoppingCart size={20} color="#fb923c" />, path: '/shop', type: 'link' },
        { name: 'Staking', icon: <DoorClosed size={20} color="#2dd4bf" />, path: '/staking', type: 'link' },
        { name: 'Trade', icon: <Repeat size={20} color="#4ade80" />, path: '/swap', type: 'link' },
        { name: 'Bank', icon: <FileText size={20} color="#fbbf24" />, path: '/bank', type: 'link' },
        { name: 'Domain', icon: <Plus size={20} color="#9a823c" />, path: '/laam', type: 'link' },
        { name: 'Profile', icon: <User size={20} color="#aa4747" />, path: '/profile', type: 'link' },
        { name: 'Rank', icon: <BarChart3 size={20} color="#facc15" />, path: '/leaderboard', type: 'link' },
        { name: 'Contact', icon: <Mail size={20} color="#324d72" />, path: '/contact', type: 'link' },
        { name: 'History', icon: <History size={20} color="#698bb4" />, type: 'action', action: 'history' },
    ];

    const topRow = allContentItems.slice(0, 4);
    const toggleButton: FooterItem = {
        name: expanded ? 'Less' : 'More',
        icon: expanded ? <X size={20} /> : <Plus size={20} />,
        type: 'action',
        action: 'toggle',
        highlight: true
    };

    const finalGridItems = expanded
        ? [...topRow, toggleButton, ...allContentItems.slice(4)]
        : [...topRow, toggleButton];

    // Identity Styling Logic
    const nameColor = stats.username?.includes('.laam')
        ? '#eab308'
        : stats.username?.includes('.skr')
            ? '#22d3ee'
            : '#fff';

    const displayOperator = stats.username || (publicKey ? `${publicKey.toString().slice(0, 4)}...` : 'SEEKER');

    return (
        <div className={`app-container ${isGamePage ? 'game-mode' : ''}`}>
            {!isGamePage && <ActivityTicker />}

            <RankUpModal isOpen={showRankModal} newRank={newRank} onClose={() => setShowRankModal(false)} />
            <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

            {!isGamePage && (
                <header className="main-header">
                    <nav className="header-nav">
                        <div className="header-top">
                            <Link href="/" className="logo">LAAMTAG HUB</Link>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {isAdmin && (
                                    <Link href="/admin/dashboard" style={{ fontSize: '10px', color: '#eab308', textDecoration: 'none', fontWeight: 900 }}>
                                        T ({pendingCount})
                                    </Link>
                                )}
                                <WalletMultiButtonDynamic />
                            </div>
                        </div>
                        <div className="stats-bar">
                            <div style={{ padding: '0 12px' }}>
                                <p className="stat-label">OPERATOR</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {stats.username && <Crown size={10} color={nameColor} />}
                                    <p className="stat-value" style={{
                                        color: nameColor,
                                        textTransform: stats.username ? 'lowercase' : 'uppercase',
                                        fontWeight: stats.username ? 900 : 400
                                    }}>
                                        {displayOperator}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <StatBox label="LAAM" value={Math.floor(stats.laam).toLocaleString()} color="#eab308" />
                                <StatBox label="TAG" value={Math.floor(stats.tag).toLocaleString()} color="#fff" />
                                <StatBox label="SOL" value={stats.sol.toFixed(2)} color="#22d3ee" />
                                <StatBox label="TIER" value={stats.tier} color="#c084fc" />
                            </div>
                        </div>
                    </nav>
                </header>
            )}

            <main className={isGamePage ? "game-content-fullscreen" : "main-content"}>
                <div className={isGamePage ? "" : "content-wrapper"}>
                    {children}
                </div>
            </main>

            {!isGamePage && (
                <footer className="main-footer">
                    <div className="footer-grid">
                        {finalGridItems.map((item, idx) => {
                            const isUrlActive = item.path ? router.pathname === item.path : false;
                            const itemClass = `footer-item ${item.highlight ? 'highlight' : ''} ${isUrlActive ? 'active' : ''}`;

                            if (item.type === 'link' && item.path) {
                                return (
                                    <Link key={`${item.name}-${idx}`} href={item.path} className={itemClass}>
                                        <div className="icon-container">{item.icon}</div>
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            }
                            return (
                                <button
                                    key={`${item.name}-${idx}`}
                                    onClick={item.action === 'history' ? () => setIsHistoryOpen(true) : () => setExpanded(!expanded)}
                                    className={itemClass}
                                >
                                    <div className="icon-container">{item.icon}</div>
                                    <span>{item.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </footer>
            )}
        </div>
    );
};

const StatBox = ({ label, value, color }: any) => (
    <div className="stat-box">
        <p className="stat-label" style={{ color }}>{label}</p>
        <p className="stat-value">{value}</p>
    </div>
);

const App: FC<AppProps> = ({ Component, pageProps }) => (
    <ContextProvider>
        <Head>
            <title>LaamTag - Terminal</title>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
            <link rel="manifest" href="/manifest.json" />
            <meta name="theme-color" content="#eab308" />
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
            <link rel="icon" type="image/png" sizes="56x56" href="/favicon-56.png" />
        </Head>
        <GlobalLayout>
            <Component {...pageProps} />
        </GlobalLayout>
    </ContextProvider>
);

export default App;