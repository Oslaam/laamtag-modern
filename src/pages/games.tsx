import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast, Toaster } from 'react-hot-toast';
import { History, ChevronLeft, Zap, UserPlus, Trophy, Gamepad2, Users } from 'lucide-react';
import styles from '../styles/Games.module.css';

// Components
import SeekerGuard from '../components/SeekerGuard';
import LootVault from '../components/LootVault';
import HistoryModal from '../components/HistoryModal';

// Dynamic Imports
const GuessGameComponent = dynamic(() => import('../components/GuessGame'), { ssr: false });
const SpinGame = dynamic(() => import('../components/SpinGame'), { ssr: false });
const DiceTerminal = dynamic(() => import('../components/DiceTerminal'), { ssr: false });
const RaffleLobby = dynamic(() => import('../components/RaffleLobby'), { ssr: false });
const PulseHunter = dynamic(() => import('../components/PulseHunter'), { ssr: false });
const Collectable = dynamic(() => import('../components/Collectable'), { ssr: false });
const ClaimBadge = dynamic(() => import('../components/ClaimBadge'), { ssr: false });
const ShooterContainer = dynamic(() => import('../components/ShooterContainer'), { ssr: false });
const ResistanceMode = dynamic(() => import('../components/ResistanceMode'), { ssr: false });

type ViewMode = 'GAMES' | 'DISCOVERY' | 'COLLECTORS';

const getRankStyle = (points: number) => {
    if (points >= 1000000) return { name: "Ascendant", color: "#60a5fa" };
    if (points >= 750000) return { name: "Eternal", color: "#a855f7" };
    if (points >= 500000) return { name: "Mythic", color: "#e879f9" };
    if (points >= 400000) return { name: "Legend", color: "#f87171" };
    if (points >= 300000) return { name: "Diamond", color: "#22d3ee" };
    if (points >= 200000) return { name: "Platinum", color: "#818cf8" };
    if (points >= 100000) return { name: "Gold Elite", color: "#fde047" };
    if (points >= 50000) return { name: "Gold", color: "#facc15" };
    if (points >= 20000) return { name: "Silver Elite", color: "#e5e7eb" };
    if (points >= 10000) return { name: "Silver", color: "#d1d5db" };
    if (points >= 5000) return { name: "Bronze Elite", color: "#fdba74" };
    return { name: "Bronze", color: "#fb923c" };
};

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
            const res = await fetch(`/api/user/me?address=${publicKey.toBase58()}`);
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
        } catch (err) { console.error("Discovery offline"); }
    }, [publicKey]);

    useEffect(() => {
        fetchUser();
        fetchDiscovery();
    }, [fetchUser, fetchDiscovery, publicKey]);

    const mutate = () => fetchUser();

    const handleSendRequest = async (targetAddress: string, targetName: string) => {
        if (!publicKey) return toast.error("CONNECT_WALLET");
        setIsLinking(targetAddress);
        try {
            const endpoint = pendingInvitePool ? '/api/friends/invite-game' : '/api/friends/request';
            const body = pendingInvitePool 
                ? { senderAddress: publicKey.toBase58(), receiverAddress: targetAddress, gameType: 'RAFFLE', poolId: pendingInvitePool }
                : { senderAddress: publicKey.toBase58(), receiverAddress: targetAddress, senderUsername: user?.username || 'A tagger' };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast.success(pendingInvitePool ? `INVITE_SENT` : `REQUEST_SENT`);
                if (!pendingInvitePool) setDiscoveredUsers(prev => prev.filter(u => u.walletAddress !== targetAddress));
                setPendingInvitePool(null);
            }
        } catch (err) { toast.error("SYSTEM_OFFLINE"); } finally { setIsLinking(null); }
    };

    return (
        <SeekerGuard>
            <div className="main-content">
                <Toaster position="bottom-center" />
                <div className="content-wrapper">
                    
                    {/* Header with Exit Control */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        {activeGame ? (
                            <button onClick={() => { setActiveGame(null); setPendingInvitePool(null); }} className={styles.exitButton}>
                                <ChevronLeft size={14} /> EXIT MODULE
                            </button>
                        ) : <div />}
                        <button onClick={() => setIsHistoryOpen(true)} className={styles.historyTrigger}>
                            <History size={16} />
                        </button>
                    </div>

                    <LootVault />

                    {!activeGame && (
                        <div className={styles.tabContainer}>
                            <button onClick={() => setActiveView('GAMES')} className={`${styles.tabLink} ${activeView === 'GAMES' ? styles.activeTab : ''}`}>
                                <Gamepad2 size={14} /> GAMES
                            </button>
                            <button onClick={() => setActiveView('DISCOVERY')} className={`${styles.tabLink} ${activeView === 'DISCOVERY' ? styles.activeTab : ''}`}>
                                <Users size={14} /> DISCOVERY
                            </button>
                            <button onClick={() => setActiveView('COLLECTORS')} className={`${styles.tabLink} ${activeView === 'COLLECTORS' ? styles.activeTab : ''}`}>
                                <Trophy size={14} /> COLLECTORS
                            </button>
                        </div>
                    )}

                    <div style={{ marginTop: '24px' }}>
                        {!activeGame ? (
                            <>
                                {/* GAMES VIEW */}
                                {activeView === 'GAMES' && (
                                    <div className={styles.moduleGrid}>
                                        <ModuleCard title="Frequency Jammer" desc="1 TAG / ATTEMPT" imageSrc="/assets/images/jammer.png" onClick={() => setActiveGame('GUESS')} />
                                        <ModuleCard title="The Reactor" desc="5 TAG / ATTEMPT" imageSrc="/assets/images/reactor.png" onClick={() => setActiveGame('SPIN')} />
                                        <ModuleCard title="Void Shooter" desc="ELIMINATE TO EARN" imageSrc="/assets/images/shooter.jpg" onClick={() => setActiveGame('SHOOTER')} />
                                        <ModuleCard title="Pulse Hunter" desc="DECRYPT FOR SKR" imageSrc="/assets/images/hunter.png" onClick={() => setActiveGame('PULSE')} />
                                        <ModuleCard title="Probability Matrix" desc="HIGH STAKES" imageSrc="/assets/images/dice.jpg" onClick={() => setActiveGame('DICE')} />
                                        <ModuleCard title="Data Scraper" desc="RAFFLE POOLS" imageSrc="/assets/images/raffle.png" onClick={() => setActiveGame('RAFFLE')} />
                                        <ModuleCard title="Resistance" desc="UNLOCK WITH SKR" imageSrc="/assets/images/resistance.png" onClick={() => setActiveGame('RESISTANCE')} />
                                    </div>
                                )}

                                {/* DISCOVERY VIEW */}
                                {activeView === 'DISCOVERY' && (
                                    <div className={styles.neuralModule}>
                                        <div className={styles.neuralHeader}>
                                            <div className={styles.neuralIcon}><Zap size={14} color="#eab308" /></div>
                                            <div>
                                                <h3 className={styles.neuralTitle}>{pendingInvitePool ? "SELECT TARGET" : "NEURAL DISCOVERY"}</h3>
                                                <p className={styles.neuralSubtitle}>{pendingInvitePool ? `INVITING TO POOL ${pendingInvitePool.slice(0, 5)}` : "PROBE FOR ACTIVE TAGGERS"}</p>
                                            </div>
                                        </div>
                                        <div className={styles.userList}>
                                            {discoveredUsers.length > 0 ? discoveredUsers.map((target) => {
                                                const rankInfo = getRankStyle(target.laamPoints || 0);
                                                return (
                                                    <div key={target.walletAddress} className={styles.userRow}>
                                                        <div className={styles.userInfo}>
                                                            <span className={styles.userName}>{target.username || target.walletAddress.slice(0,8)}</span>
                                                            <span className={styles.userRank} style={{ color: rankInfo.color }}>RANK: {rankInfo.name}</span>
                                                        </div>
                                                        <button disabled={isLinking === target.walletAddress} onClick={() => handleSendRequest(target.walletAddress, target.username || 'Tagger')} className={styles.linkButton}>
                                                            {isLinking === target.walletAddress ? '...' : pendingInvitePool ? <Zap size={14} /> : <UserPlus size={14} />}
                                                        </button>
                                                    </div>
                                                );
                                            }) : <p className={styles.emptyText}>SCANNING SECTOR...</p>}
                                        </div>
                                    </div>
                                )}

                                {/* COLLECTORS VIEW */}
                                {activeView === 'COLLECTORS' && (
                                    <div className={styles.moduleGrid}>
                                        <ModuleCard title="Warrior Trophy" desc="CLAIM REWARDS" imageSrc="/assets/images/collectable.jpg" onClick={() => setActiveGame('COLLECTABLE')} />
                                        <ModuleCard title="Claim Badge" desc="NEURAL UPLINK" imageSrc="/assets/images/claim-badge.png" onClick={() => setActiveGame('BADGE')} />
                                    </div>
                                )}
                            </>
                        ) : (
                            /* ACTIVE MODULE TERMINAL */
                            <div className="terminal-card" style={{ padding: '24px' }}>
                                {activeGame === 'GUESS' && <GuessGameComponent />}
                                {activeGame === 'SPIN' && <SpinGame />}
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

const ModuleCard = ({ title, desc, imageSrc, onClick }: any) => (
    <button onClick={onClick} className={styles.moduleCard}>
        <img src={imageSrc} alt={title} className={styles.moduleImage} />
        <div className={styles.moduleTextContent}>
            <h3 className={styles.moduleTitle}>{title}</h3>
            <p className={styles.moduleDesc}>{desc}</p>
        </div>
    </button>
);