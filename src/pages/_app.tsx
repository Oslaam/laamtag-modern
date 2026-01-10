import type { AppProps } from 'next/app';
import Head from 'next/head';
import { FC, useState, useEffect, useCallback } from 'react';
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
    FileText, User, BarChart3, Mail, History, Coins, ScrollText, Plus, Minus
} from 'lucide-react';

import '@solana/wallet-adapter-react-ui/styles.css';
import '../styles/globals.css';

const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

const ADMIN_WALLETS = [
    "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc",
    "CfRjo855LvAWcviiiq7DdcLz9i5Xqy8Vvnmh95UnL9Ua"
];

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
    const [stats, setStats] = useState({ laam: 0, tag: 0, sol: 0, tier: 'BRONZE', username: '' });
    const [pendingCount, setPendingCount] = useState(0);

    const isAdmin = publicKey && ADMIN_WALLETS.includes(publicKey.toString());

    // Memoized fetch function to update balances
    const fetchStats = useCallback(async () => {
        if (!publicKey) return;

        try {
            // Fetch User DB Stats (LAAM, TAG, Rank)
            const res = await fetch(`/api/user/${publicKey.toString()}`);
            const data = await res.json();
            if (res.ok) {
                setStats(prev => ({
                    ...prev,
                    laam: data.laamPoints || 0,
                    tag: data.tagTickets || 0,
                    tier: data.rank || 'BRONZE',
                    username: data.username || ''
                }));
            }

            // Fetch SOL Balance
            const bal = await connection.getBalance(publicKey);
            setStats(prev => ({ ...prev, sol: bal / LAMPORTS_PER_SOL }));

            // Fetch Admin Pending Count if applicable
            if (isAdmin) {
                const adminRes = await fetch('/api/admin/pending', {
                    headers: { 'x-admin-wallet': publicKey.toString() }
                });
                const adminData = await adminRes.json();
                setPendingCount(adminData.count || 0);
            }
        } catch (err) {
            console.error("Failed to fetch user stats:", err);
        }
    }, [publicKey, connection, isAdmin]);

    useEffect(() => {
        fetchStats();

        // Listen for the custom 'balanceUpdate' event (triggered by SpinGame)
        window.addEventListener('balanceUpdate', fetchStats);

        // Polling backup (every 30 seconds)
        const interval = setInterval(fetchStats, 30000);

        return () => {
            window.removeEventListener('balanceUpdate', fetchStats);
            clearInterval(interval);
        };
    }, [fetchStats]);

    const navItems = [
        { name: 'Mint', icon: <Coins size={20} />, path: '/mint' },
        { name: 'Quests', icon: <ScrollText size={20} />, path: '/quests' },
        { name: 'Vault', icon: <Layers size={20} />, path: '/staking' },
        { name: 'Games', icon: <Gamepad2 size={20} />, path: '/games' },
        { name: 'Shop', icon: <ShoppingCart size={20} />, path: '/shop' },
        { name: 'Bank', icon: <FileText size={20} />, path: '/bank' },
        { name: 'Profile', icon: <User size={20} />, path: '/profile' },
        { name: 'Rank', icon: <BarChart3 size={20} />, path: '/leaderboard' },
        { name: 'Contact', icon: <Mail size={20} />, path: '/contact' },
    ];

    const visibleItems = expanded ? navItems : navItems.slice(0, 3);

    return (
        <div className="flex flex-col h-screen w-full bg-black text-white font-sans overflow-hidden">
            <RankUpModal isOpen={showRankModal} newRank={newRank} onClose={() => setShowRankModal(false)} />
            <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

            {/* HEADER */}
            <header className="sticky top-0 shrink-0 z-[110] bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 pt-6">
                <nav className="flex flex-col gap-4 max-w-6xl mx-auto w-full">
                    <div className="flex justify-between items-center">
                        <Link href="/" className="font-black italic text-yellow-500 text-2xl tracking-tighter">LAAM</Link>
                        <div className="flex items-center gap-3">
                            {isAdmin && (
                                <Link href="/admin/dashboard" className="text-[10px] font-black text-yellow-500 uppercase animate-pulse">
                                    T ({pendingCount})
                                </Link>
                            )}
                            <WalletMultiButtonDynamic />
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-white/5 rounded-xl p-2 border border-white/10">
                        <div className="px-2">
                            <p className="text-[7px] uppercase opacity-60 font-black">Seeker</p>
                            <p className="font-black text-xs text-yellow-500 truncate w-24">
                                {stats.username ? `${stats.username}.skr` : 'anonymous.skr'}
                            </p>
                        </div>
                        <div className="flex gap-1 overflow-x-auto no-scrollbar">
                            <StatBox label="LAAM" value={stats.laam.toLocaleString()} color="text-yellow-500" />
                            <StatBox label="TAG" value={stats.tag.toLocaleString()} color="text-white" />
                            <StatBox label="SOL" value={stats.sol.toFixed(2)} color="text-cyan-400" />
                            <StatBox label="TIER" value={stats.tier} color="text-purple-400" />
                        </div>
                    </div>
                </nav>
            </header>

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4">
                <div className="max-w-xl mx-auto w-full pb-48">
                    {children}
                </div>
            </main>

            {/* EXPANDABLE GRID FOOTER */}
            <footer className="fixed bottom-0 left-0 right-0 z-[120] bg-black/95 backdrop-blur-2xl border-t border-yellow-500/20 px-4 pt-4 pb-8 transition-all duration-300">
                <div className={`grid grid-cols-5 gap-y-6 gap-x-2 max-w-xl mx-auto w-full ${expanded ? 'grid-rows-2' : 'grid-rows-1'}`}>

                    {visibleItems.map((item) => (
                        <FooterBtn
                            key={item.name}
                            href={item.path}
                            icon={item.icon}
                            label={item.name}
                            active={router.pathname === item.path}
                        />
                    ))}

                    <button
                        onClick={() => setIsHistoryOpen(true)}
                        className="flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-white transition-colors"
                    >
                        <History size={20} />
                        <span className="text-[8px] font-black uppercase">History</span>
                    </button>

                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="flex flex-col items-center justify-center gap-1 text-yellow-500 transition-all active:scale-90"
                    >
                        {expanded ? <Minus size={20} className="animate-pulse" /> : <Plus size={20} className="animate-pulse" />}
                        <span className="text-[8px] font-black uppercase">{expanded ? 'Less' : 'More'}</span>
                    </button>
                </div>
            </footer>
        </div>
    );
};

const StatBox = ({ label, value, color }: any) => (
    <div className="px-2 border-r border-white/5 last:border-0 text-center min-w-[50px]">
        <p className={`text-[7px] font-black uppercase opacity-60 mb-0.5 ${color}`}>{label}</p>
        <p className="text-[10px] font-black text-white leading-none">{value}</p>
    </div>
);

const FooterBtn = ({ href, icon, label, active }: any) => (
    <Link href={href} className="flex flex-col items-center justify-center gap-1 group">
        <div className={`transition-all ${active ? 'text-yellow-500 scale-110' : 'text-gray-500 group-hover:text-white'}`}>
            {icon}
        </div>
        <span className={`text-[8px] font-black uppercase ${active ? 'text-yellow-500' : 'text-gray-500 group-hover:text-white'}`}>
            {label}
        </span>
    </Link>
);

const App: FC<AppProps> = ({ Component, pageProps }) => (
    <ContextProvider>
        <Head>
            <title>LaamTag - Terminal</title>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        </Head>
        <GlobalLayout>
            <Component {...pageProps} />
        </GlobalLayout>
    </ContextProvider>
);

export default App;