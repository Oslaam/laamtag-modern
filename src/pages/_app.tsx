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
import { useRankWatcher } from '../hooks/useRankWatcher';
import dynamic from 'next/dynamic';
import {
    Hammer, Trophy, Layers, Gamepad2, ShoppingCart,
    FileText, User, BarChart3, Mail, History, Coins, ScrollText, Plus, X,
    DoorClosed
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
    const [stats, setStats] = useState({ laam: 0, tag: 0, sol: 0, tier: 'BRONZE', username: '', currentStage: 1, weaponLevel: 1 });
    const [pendingCount, setPendingCount] = useState(0);

    const isGamePage = router.pathname.includes('/games/shooter');
    const isAdmin = publicKey && ADMIN_WALLETS.includes(publicKey.toString());

    const fetchStats = useCallback(async () => {
        if (!publicKey) return;

        // 1. Fetch DB Stats (LAAM/TAG) - This usually works fine
        try {
            const res = await fetch(`/api/user/${publicKey.toString()}`);
            const data = await res.json();
            if (res.ok) {
                setStats(prev => ({
                    ...prev,
                    laam: data.laamPoints || 0,
                    tag: data.tagTickets || 0,
                    tier: data.rank || 'BRONZE',
                    username: data.username || '',
                    currentStage: data.shooterStage || 1,
                    weaponLevel: data.weaponLevel || 1
                }));
            }
        } catch (err) {
            console.error("DB Stats Error:", err);
        }

        // 2. Fetch SOL Balance - THIS is what is causing the CORS/Network error
        try {
            const bal = await connection.getBalance(publicKey);
            setStats(prev => ({ ...prev, sol: bal / LAMPORTS_PER_SOL }));
        } catch (err) {
            console.warn("Solana RPC Error (CORS):", err);
            // We don't crash the whole function, just log a warning
        }

        // 3. Admin Check
        if (isAdmin) {
            try {
                const adminRes = await fetch('/api/admin/pending', {
                    headers: { 'x-admin-wallet': publicKey.toString() }
                });
                const adminData = await adminRes.json();
                setPendingCount(adminData.count || 0);
            } catch (e) { console.error("Admin fetch error", e); }
        }
    }, [publicKey, connection, isAdmin]);

    useEffect(() => {
        fetchStats();
        window.addEventListener('balanceUpdate', fetchStats);
        const interval = setInterval(fetchStats, 30000);
        return () => {
            window.removeEventListener('balanceUpdate', fetchStats);
            clearInterval(interval);
        };
    }, [fetchStats]);

    const allContentItems: FooterItem[] = [
        { name: 'Mint', icon: <Coins size={20} />, path: '/mint', type: 'link' },
        { name: 'Quests', icon: <ScrollText size={20} />, path: '/quests', type: 'link' },
        { name: 'Vault', icon: <Layers size={20} />, path: '/vault', type: 'link' },
        { name: 'Games', icon: <Gamepad2 size={20} />, path: '/games', type: 'link' },
        { name: 'Shop', icon: <ShoppingCart size={20} />, path: '/shop', type: 'link' },
        { name: 'Staking', icon: <DoorClosed size={20} />, path: '/staking', type: 'link' },
        { name: 'Bank', icon: <FileText size={20} />, path: '/bank', type: 'link' },
        { name: 'Profile', icon: <User size={20} />, path: '/profile', type: 'link' },
        { name: 'Rank', icon: <BarChart3 size={20} />, path: '/leaderboard', type: 'link' },
        { name: 'History', icon: <History size={20} />, type: 'action', action: 'history' },
        { name: 'Contact', icon: <Mail size={20} />, path: '/contact', type: 'link' },
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

    return (
        <div className="app-container">
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
                                <p className="stat-value" style={{ color: '#eab308', textTransform: 'uppercase' }}>
                                    {stats.username ? stats.username : 'SEEKER'}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <StatBox label="LAAM" value={stats.laam.toLocaleString()} color="#eab308" />
                                <StatBox label="TAG" value={stats.tag.toLocaleString()} color="#fff" />
                                <StatBox label="SOL" value={stats.sol.toFixed(2)} color="#22d3ee" />
                                <StatBox label="TIER" value={stats.tier} color="#c084fc" />
                            </div>
                        </div>
                    </nav>
                </header>
            )}

            <main className={isGamePage ? "game-content-fullscreen" : "main-content"}>
                <div className={isGamePage ? "" : "content-wrapper"}>
                    {/* Inject stats if it's the game container */}
                    {router.pathname === '/games/shooter' ? (
                        <div className="w-full h-full">
                            {children}
                        </div>
                    ) : children}
                </div>
            </main>

            {!isGamePage && (
                <footer className="main-footer">
                    <div className="footer-grid">
                        {finalGridItems.map((item: FooterItem, idx: number) => {
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
            {/* 1. Mobile specific viewport settings */}
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
            
            {/* 2. Link to your manifest file */}
            <link rel="manifest" href="/manifest.json" />
            
            {/* 3. Theme color for the Android status bar */}
            <meta name="theme-color" content="#eab308" />
            
            {/* 4. iOS support (optional but good) */}
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        </Head>
        <GlobalLayout>
            <Component {...pageProps} />
        </GlobalLayout>
    </ContextProvider>
);

export default App;