import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast, Toaster } from 'react-hot-toast';
import { History, ChevronLeft, Zap, UserPlus, Trophy, Gamepad2, Users } from 'lucide-react';
import styles from '../styles/Games.module.css';

import SeekerGuard from '../components/SeekerGuard';
import LootVault from '../components/LootVault';
import HistoryModal from '../components/HistoryModal';

const GuessGameComponent = dynamic(() => import('../components/GuessGame'), { ssr: false });
const SpinGame = dynamic(() => import('../components/SpinGame'), { ssr: false });
const DiceTerminal = dynamic(() => import('../components/DiceTerminal'), { ssr: false });
const RaffleLobby = dynamic(() => import('../components/RaffleLobby'), { ssr: false });
const PulseHunter = dynamic(() => import('../components/PulseHunter'), { ssr: false });
const Collectable = dynamic(() => import('../components/Collectable'), { ssr: false });
const ClaimBadge = dynamic(() => import('../components/ClaimBadge'), { ssr: false });
const ShooterContainer = dynamic(() => import('../components/ShooterContainer'), { ssr: false });
const ResistanceMode = dynamic(() => import('../components/ResistanceMode'), { ssr: false });
const PlinkoGame = dynamic(() => import('../components/PlinkoGame'), { ssr: false });

type ViewMode = 'GAMES' | 'DISCOVERY' | 'COLLECTORS';

const getRankStyle = (points: number) => {
    if (points >= 1000000) return { name: 'Ascendant', color: '#60a5fa' };
    if (points >= 750000) return { name: 'Eternal', color: '#a855f7' };
    if (points >= 500000) return { name: 'Mythic', color: '#e879f9' };
    if (points >= 400000) return { name: 'Legend', color: '#f87171' };
    if (points >= 300000) return { name: 'Diamond', color: '#22d3ee' };
    if (points >= 200000) return { name: 'Platinum', color: '#818cf8' };
    if (points >= 100000) return { name: 'Gold Elite', color: '#fde047' };
    if (points >= 50000) return { name: 'Gold', color: '#facc15' };
    if (points >= 20000) return { name: 'Silver Elite', color: '#e5e7eb' };
    if (points >= 10000) return { name: 'Silver', color: '#d1d5db' };
    if (points >= 5000) return { name: 'Bronze Elite', color: '#fdba74' };
    return { name: 'Bronze', color: '#fb923c' };
};

const GAME_MODULES = [
    { id: 'GUESS', title: 'Frequency Jammer', desc: '1 TAG / ATTEMPT', img: '/assets/images/jammer.png' },
    { id: 'SPIN', title: 'The Reactor', desc: '5 TAG / ATTEMPT', img: '/assets/images/reactor.png' },
    { id: 'PLINKO', title: 'Blanko Drop', desc: 'MASTER THE DROP', img: '/assets/images/plinko.png' },
    { id: 'SHOOTER', title: 'Void Shooter', desc: 'ELIMINATE TO EARN', img: '/assets/images/shooter.jpg' },
    { id: 'PULSE', title: 'Pulse Hunter', desc: 'DECRYPT FOR SKR', img: '/assets/images/hunter.png' },
    { id: 'DICE', title: 'Probability Matrix', desc: 'HIGH STAKES', img: '/assets/images/dice.jpg' },
    { id: 'RAFFLE', title: 'Data Scraper', desc: 'RAFFLE POOLS', img: '/assets/images/raffle.png' },
    { id: 'RESISTANCE', title: 'Resistance', desc: 'SECURE TERMINAL', img: '/assets/images/resistance.png' },
];

const COLLECTOR_MODULES = [
    { id: 'COLLECTABLE', title: 'Warrior Trophy', desc: 'CLAIM REWARDS', img: '/assets/images/collectable.jpg' },
    { id: 'BADGE', title: 'Claim Badge', desc: 'NEURAL UPLINK', img: '/assets/images/claim-badge.png' },
];

export default function GamesPage() {
    const [activeView, setActiveView] = useState<ViewMode>('GAMES');
    const [activeGame, setActiveGame] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [discoveredUsers, setDiscoveredUsers] = useState<any[]>([]);
    const [isLinking, setIsLinking] = useState<string | null>(null);
    const [pendingInvitePool, setPendingInvitePool] = useState<string | null>(null);

    const { publicKey } = useWallet();

    const fetchUser = useCallback(async () => {
        if (!publicKey) return;
        try {
            const res = await fetch(`/api/user/${publicKey.toBase58()}`);
            const data = await res.json();
            if (res.ok) setUser(data);
        } catch (err) { console.error(err); }
    }, [publicKey]);

    const fetchDiscovery = useCallback(async () => {
        if (!publicKey) return;
        try {
            const res = await fetch(`/api/user/friends-discovery?exclude=${publicKey.toBase58()}`);
            const data = await res.json();
            if (res.ok) setDiscoveredUsers(data);
        } catch { console.error('Discovery offline'); }
    }, [publicKey]);

    useEffect(() => {
        fetchUser();
        fetchDiscovery();
    }, [fetchUser, fetchDiscovery, publicKey]);

    const mutate = () => fetchUser();

    const handleSendRequest = async (targetAddress: string, targetName: string) => {
        if (!publicKey) return toast.error('CONNECT_WALLET');
        setIsLinking(targetAddress);
        try {
            const endpoint = pendingInvitePool ? '/api/friends/invite-game' : '/api/friends/request';
            const body = pendingInvitePool
                ? { senderAddress: publicKey.toBase58(), receiverAddress: targetAddress, gameType: 'RAFFLE', poolId: pendingInvitePool }
                : { senderAddress: publicKey.toBase58(), receiverAddress: targetAddress, senderUsername: user?.username || 'A tagger' };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                toast.success(pendingInvitePool ? 'INVITE_SENT' : 'REQUEST_SENT');
                if (!pendingInvitePool) setDiscoveredUsers(prev => prev.filter(u => u.walletAddress !== targetAddress));
                setPendingInvitePool(null);
            }
        } catch { toast.error('SYSTEM_OFFLINE'); }
        finally { setIsLinking(null); }
    };

    const handleExit = () => { setActiveGame(null); setPendingInvitePool(null); };

    return (
        <SeekerGuard>
            <div className="main-content">
                <Toaster position="bottom-center" />
                <div className="content-wrapper">

                    {/* ── TOP BAR ── */}
                    <div className={styles.topBar}>
                        {activeGame ? (
                            <button onClick={handleExit} className={styles.exitButton}>
                                <ChevronLeft size={13} /> EXIT MODULE
                            </button>
                        ) : <div />}
                        <button onClick={() => setIsHistoryOpen(true)} className={styles.historyTrigger}>
                            <History size={15} />
                        </button>
                    </div>

                    <LootVault />

                    {/* ── TABS ── */}
                    {!activeGame && (
                        <div className={styles.tabContainer}>
                            {([
                                { id: 'GAMES', icon: <Gamepad2 size={13} />, label: 'GAMES' },
                                { id: 'DISCOVERY', icon: <Users size={13} />, label: 'DISCOVERY' },
                                { id: 'COLLECTORS', icon: <Trophy size={13} />, label: 'COLLECTORS' },
                            ] as const).map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveView(tab.id)}
                                    className={`${styles.tabLink} ${activeView === tab.id ? styles.activeTab : ''}`}
                                >
                                    {tab.icon}{tab.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className={styles.viewArea}>
                        {!activeGame ? (
                            <>
                                {/* GAMES */}
                                {activeView === 'GAMES' && (
                                    <div className={styles.moduleGrid}>
                                        {GAME_MODULES.map(m => (
                                            <ModuleCard key={m.id} title={m.title} desc={m.desc} imageSrc={m.img} onClick={() => setActiveGame(m.id)} />
                                        ))}
                                    </div>
                                )}

                                {/* DISCOVERY */}
                                {activeView === 'DISCOVERY' && (
                                    <div className={styles.neuralModule}>
                                        <div className={styles.neuralHeader}>
                                            <div className={styles.neuralIcon}>
                                                <Zap size={13} color="#eab308" />
                                            </div>
                                            <div>
                                                <h3 className={styles.neuralTitle}>
                                                    {pendingInvitePool ? 'SELECT TARGET' : 'NEURAL DISCOVERY'}
                                                </h3>
                                                <p className={styles.neuralSubtitle}>
                                                    {pendingInvitePool
                                                        ? `INVITING TO POOL ${pendingInvitePool.slice(0, 5)}`
                                                        : 'PROBE FOR ACTIVE TAGGERS'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className={styles.userList}>
                                            {discoveredUsers.length > 0 ? discoveredUsers.map(target => {
                                                const rankInfo = getRankStyle(target.laamPoints || 0);
                                                return (
                                                    <div key={target.walletAddress} className={styles.userRow}>
                                                        <div className={styles.userInfo}>
                                                            <span className={styles.userName}>
                                                                {target.username || target.walletAddress.slice(0, 8)}
                                                            </span>
                                                            <span className={styles.userRank} style={{ color: rankInfo.color }}>
                                                                RANK: {rankInfo.name}
                                                            </span>
                                                        </div>
                                                        <button
                                                            disabled={isLinking === target.walletAddress}
                                                            onClick={() => handleSendRequest(target.walletAddress, target.username || 'Tagger')}
                                                            className={styles.linkButton}
                                                        >
                                                            {isLinking === target.walletAddress
                                                                ? '...'
                                                                : pendingInvitePool
                                                                    ? <Zap size={13} />
                                                                    : <UserPlus size={13} />}
                                                        </button>
                                                    </div>
                                                );
                                            }) : (
                                                <p className={styles.emptyText}>SCANNING SECTOR...</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* COLLECTORS */}
                                {activeView === 'COLLECTORS' && (
                                    <div className={styles.moduleGrid}>
                                        {COLLECTOR_MODULES.map(m => (
                                            <ModuleCard key={m.id} title={m.title} desc={m.desc} imageSrc={m.img} onClick={() => setActiveGame(m.id)} />
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className={styles.activeModuleWrap}>
                                {activeGame === 'GUESS' && <GuessGameComponent />}
                                {activeGame === 'SPIN' && <SpinGame />}
                                {activeGame === 'PLINKO' && <PlinkoGame />}
                                {activeGame === 'SHOOTER' && <ShooterContainer />}
                                {activeGame === 'PULSE' && user && <PulseHunter user={user} onUpdateUser={mutate} />}
                                {activeGame === 'DICE' && user && <DiceTerminal user={user} refreshUser={mutate} />}
                                {activeGame === 'RAFFLE' && <RaffleLobby onInviteRequested={(id) => { setActiveGame(null); setPendingInvitePool(id); setActiveView('DISCOVERY'); }} />}
                                {activeGame === 'RESISTANCE' && <ResistanceMode />}
                                {activeGame === 'COLLECTABLE' && <Collectable />}
                                {activeGame === 'BADGE' && user && <ClaimBadge user={user} mutate={mutate} />}
                            </div>
                        )}
                    </div>

                </div>
                <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
            </div>
        </SeekerGuard>
    );
}

const ModuleCard = ({ title, desc, imageSrc, onClick }: { title: string; desc: string; imageSrc: string; onClick: () => void }) => (
    <button onClick={onClick} className={styles.moduleCard}>
        <div className={styles.moduleImgWrap}>
            <img src={imageSrc} alt={title} className={styles.moduleImage} />
        </div>
        <div className={styles.moduleTextContent}>
            <h3 className={styles.moduleTitle}>{title}</h3>
            <p className={styles.moduleDesc}>{desc}</p>
        </div>
    </button>
);