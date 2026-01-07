import type { AppProps } from 'next/app';
import Head from 'next/head';
import { FC, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ContextProvider } from '../contexts/ContextProvider';
import RankUpModal from '../components/RankUpModal';
import { useRankWatcher } from '../hooks/useRankWatcher';
import dynamic from 'next/dynamic'; // Added for dynamic import
import {
    Hammer, Trophy, Layers, Gamepad2, ShoppingCart,
    FileText, User, BarChart3, Mail, Plus, Minus
} from 'lucide-react';

import '@solana/wallet-adapter-react-ui/styles.css';
import '../styles/globals.css';

// --- FIX 1: DYNAMIC WALLET BUTTON ---
const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

const GlobalLayout: FC<{ children: React.ReactNode }> = ({ children }) => {
    const { publicKey } = useWallet();
    const { connection } = useConnection();
    const router = useRouter();
    const { showRankModal, setShowRankModal, newRank } = useRankWatcher();

    const [footerExpanded, setFooterExpanded] = useState(false);
    const [stats, setStats] = useState({ laam: 0, tag: 0, sol: 0, tier: 'BRONZE' });

    // --- FIX 2: MOUNT STATE ---
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!publicKey || !mounted) return;

        fetch(`/api/user/${publicKey.toString()}`)
            .then(res => res.json())
            .then(data => setStats(prev => ({
                ...prev,
                laam: data.laamPoints || 0,
                tag: data.tagTickets || 0,
                tier: data.rank || 'BRONZE'
            })));

        connection.getBalance(publicKey).then(bal => {
            setStats(prev => ({ ...prev, sol: bal / LAMPORTS_PER_SOL }));
        });
    }, [publicKey, connection, mounted]);

    const navItems = [
        { name: 'Mint', icon: <Hammer size={20} />, path: '/mint' },
        { name: 'Quests', icon: <Trophy size={20} />, path: '/quests' },
        { name: 'Staking', icon: <Layers size={20} />, path: '/staking' },
        { name: 'Games', icon: <Gamepad2 size={20} />, path: '/games' },
        { name: 'Shop', icon: <ShoppingCart size={20} />, path: '/shop' },
        { name: 'Docs', icon: <FileText size={20} />, path: '/whitepaper', hidden: true },
        { name: 'Profile', icon: <User size={20} />, path: '/profile', hidden: true },
        { name: 'Rank', icon: <BarChart3 size={20} />, path: '/leaderboard', hidden: true },
        { name: 'Contact', icon: <Mail size={20} />, path: '/contact', hidden: true },
    ];

    const visibleItems = footerExpanded ? navItems : navItems.filter(i => !i.hidden);

    return (
        <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
            <RankUpModal isOpen={showRankModal} newRank={newRank} onClose={() => setShowRankModal(false)} />

            <header className="bg-[#050505] border-b border-white/10 p-4 pt-8 shrink-0 z-50">
                <div className="max-w-xl mx-auto flex justify-between items-center mb-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">User ID</span>
                        <span className="text-sm font-black italic text-yellow-500">
                            {mounted && publicKey ? `${publicKey.toString().slice(0, 4)}.skr` : "GUEST"}
                        </span>
                    </div>
                    {/* Use the Dynamic Button here */}
                    <WalletMultiButtonDynamic className="!bg-white !text-black !h-8 !text-[10px] !font-black !px-4 !rounded-lg" />
                </div>

                <div className="max-w-xl mx-auto grid grid-cols-4 gap-2">
                    <StatBox label="LAAM" value={stats.laam.toLocaleString()} color="text-yellow-500" />
                    <StatBox label="TAG" value={stats.tag} color="text-purple-400" />
                    <StatBox label="SOL" value={stats.sol.toFixed(3)} color="text-cyan-400" />
                    <StatBox label="TIER" value={stats.tier} color="text-orange-500" />
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-32">
                {children}
            </main>

            <footer className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 border-t border-white/10 p-4 pb-8 z-50">
                <div className="max-w-xl mx-auto">
                    <div className={`grid ${footerExpanded ? 'grid-cols-5' : 'grid-cols-6'} gap-4 items-center justify-items-center`}>
                        {visibleItems.map((item) => (
                            <button
                                key={item.name}
                                onClick={() => router.push(item.path)}
                                className={`flex flex-col items-center gap-1 transition-all ${router.pathname === item.path ? 'text-yellow-500 scale-110' : 'text-gray-500 hover:text-white'}`}
                            >
                                {item.icon}
                                <span className="text-[8px] font-black uppercase tracking-tighter">{item.name}</span>
                            </button>
                        ))}

                        <button
                            onClick={() => setFooterExpanded(!footerExpanded)}
                            className="flex flex-col items-center gap-1 text-yellow-500 font-bold"
                        >
                            {footerExpanded ? <Minus size={20} /> : <Plus size={20} />}
                            <span className="text-[8px] font-black uppercase tracking-tighter">{footerExpanded ? "Less" : "More"}</span>
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const StatBox = ({ label, value, color }: any) => (
    <div className="bg-white/5 border border-white/10 rounded-xl py-2 text-center shadow-inner">
        <p className={`text-[8px] font-black uppercase ${color}`}>{label}</p>
        <p className="text-xs font-black tracking-tight">{value}</p>
    </div>
);

const App: FC<AppProps> = ({ Component, pageProps }) => {
    return (
        <ContextProvider>
            <Head>
                <title>LaamTag - Mobile Hub</title>
                <link rel="icon" href="/assets/images/favicon.png" />
            </Head>
            <GlobalLayout>
                <Component {...pageProps} />
            </GlobalLayout>
        </ContextProvider>
    );
};

export default App;