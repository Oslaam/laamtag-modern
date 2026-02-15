import { useState, useEffect, useCallback } from 'react';
import SeekerGuard from '../components/SeekerGuard';
import GuessGameComponent from '../components/GuessGame';
import SpinGame from '../components/SpinGame';
import DiceTerminal from '../components/DiceTerminal';
import RaffleLobby from '../components/RaffleLobby';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { toast, Toaster } from 'react-hot-toast';
import styles from '../styles/Games.module.css';

const ShooterContainer = dynamic(
    () => import('../components/ShooterContainer'),
    { ssr: false }
);
import LootVault from '../components/LootVault';
import HistoryModal from '../components/HistoryModal';
import { History, ChevronLeft, Zap, UserPlus } from 'lucide-react';
import ResistanceMode from '../components/ResistanceMode';

// Helper for Rank Colors based on your provided tiers
const getRankStyle = (points: number) => {
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
    const [activeGame, setActiveGame] = useState<'GUESS' | 'SPIN' | 'SHOOTER' | 'DICE' | 'RAFFLE' | 'RESISTANCE' | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [discoveredUsers, setDiscoveredUsers] = useState<any[]>([]);
    const [isLinking, setIsLinking] = useState<string | null>(null);

    // New state for handling Raffle Invites via Neural Discovery
    const [pendingInvitePool, setPendingInvitePool] = useState<string | null>(null);

    const { publicKey } = useWallet();

    const fetchUser = useCallback(async () => {
        if (!publicKey) return;
        try {
            const res = await fetch(`/api/user/me?address=${publicKey.toBase58()}`);
            const data = await res.json();
            if (res.ok) setUser(data);
        } catch (err) {
            console.error("Failed to fetch user:", err);
        }
    }, [publicKey]);

    const fetchDiscovery = useCallback(async () => {
        if (!publicKey) return;
        try {
            const res = await fetch(`/api/user/friends-discovery?exclude=${publicKey.toBase58()}`);
            const data = await res.json();
            if (res.ok) setDiscoveredUsers(data);
        } catch (err) {
            console.error("Discovery offline");
        }
    }, [publicKey]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const moduleParam = params.get('module');
        const poolParam = params.get('poolId');

        if (moduleParam === 'RAFFLE') {
            setActiveGame('RAFFLE');
            if (poolParam) {
                toast.success(`TARGETING POOL: ${poolParam.slice(0, 5)}...`);
            }
        }
    }, []);

    useEffect(() => {
        fetchUser();
        fetchDiscovery();
    }, [fetchUser, fetchDiscovery, publicKey]);

    const mutate = () => fetchUser();

    const handleSendRequest = async (targetAddress: string, targetName: string) => {
        if (!publicKey) return toast.error("CONNECT_WALLET");
        setIsLinking(targetAddress);

        try {
            // Check if we are in "Invite Mode" for a Raffle
            if (pendingInvitePool) {
                const res = await fetch('/api/friends/invite-game', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        senderAddress: publicKey.toBase58(),
                        receiverAddress: targetAddress,
                        gameType: 'RAFFLE',
                        poolId: pendingInvitePool
                    })
                });

                if (res.ok) {
                    toast.success(`RAFFLE_INVITE_SENT_TO_${targetName.toUpperCase()}`);
                    setPendingInvitePool(null); // Clear invite mode
                } else {
                    throw new Error("INVITE_FAILED");
                }
                return;
            }

            // Normal Friend Request Logic
            const res = await fetch('/api/friends/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderAddress: publicKey.toBase58(),
                    receiverAddress: targetAddress,
                    senderUsername: user?.username || 'A tagger'
                })
            });

            if (res.ok) {
                toast.success(`REQUEST_SENT_TO_${targetName.toUpperCase()}`);
                setDiscoveredUsers(prev => prev.filter(u => u.walletAddress !== targetAddress));
            } else {
                const data = await res.json();
                toast.error(data.error || "LINK_FAILED");
            }
        } catch (err) {
            toast.error("SYSTEM_OFFLINE");
        } finally {
            setIsLinking(null);
        }
    };

    return (
        <SeekerGuard>
            <div className="main-content">
                <Toaster position="bottom-center" />
                <div className="content-wrapper">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                        <div style={{ flex: 1 }}>
                            {activeGame && (
                                <button onClick={() => { setActiveGame(null); setPendingInvitePool(null); }} style={{ background: 'none', border: 'none', color: '#eab308', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 900 }}>
                                    <ChevronLeft size={14} /> EXIT MODULE
                                </button>
                            )}
                        </div>
                        <div style={{ textAlign: 'center', flex: 2 }}>
                            <h1 className="page-title" style={{ color: '#eab308', margin: 0 }}>Gaming Terminal</h1>
                            <p className="terminal-desc" style={{ fontSize: '10px', marginTop: '4px' }}>
                                {activeGame ? `SYSTEM ACTIVE: ${activeGame}` : 'SELECT MODULE'}
                            </p>
                        </div>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIsHistoryOpen(true)} className="terminal-button-icon">
                                <History size={18} />
                            </button>
                        </div>
                    </div>

                    <LootVault />

                    <div style={{ marginTop: '40px' }}>
                        {!activeGame ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <ModuleCard title="Frequency Jammer" desc="1 TAG PER ATTEMPT" imageSrc="/assets/images/jammer.png" onClick={() => setActiveGame('GUESS')} />
                                <ModuleCard title="The Reactor" desc="5 TAG PER ATTEMPT" imageSrc="/assets/images/reactor.png" onClick={() => setActiveGame('SPIN')} />
                                <ModuleCard title="Void Shooter" desc="ELIMINATE TO EARN" imageSrc="/assets/images/shooter.jpg" onClick={() => setActiveGame('SHOOTER')} />
                                <ModuleCard title="Probability Matrix" desc="HIGH STAKES RECOVERY" imageSrc="/assets/images/dice.jpg" onClick={() => setActiveGame('DICE')} />
                                <ModuleCard title="Data Scraper Raffle" desc="POOL ENTRY & REFUNDS" imageSrc="/assets/images/raffle.png" onClick={() => setActiveGame('RAFFLE')} />
                                <ModuleCard title="Resistance Mode" desc="UNLOCK WITH $SKR" imageSrc="/assets/images/resistance.png" onClick={() => setActiveGame('RESISTANCE')} />

                                {/* NEURAL DISCOVERY MODULE */}
                                <div className={`${styles.neuralModule} ${pendingInvitePool ? styles.inviteModeActive : ''}`}>
                                    <div className={styles.neuralHeader}>
                                        <div className={styles.neuralIcon}>
                                            {pendingInvitePool ? <Zap size={14} color="#eab308" /> : <Zap size={14} color="#eab308" />}
                                        </div>
                                        <div>
                                            <h3 className={styles.neuralTitle}>{pendingInvitePool ? "SELECT TARGET" : "NEURAL DISCOVERY"}</h3>
                                            <p className={styles.neuralSubtitle}>{pendingInvitePool ? `INVITING TO POOL ${pendingInvitePool.slice(0, 5)}` : "PROBE FOR ACTIVE TAGGERS"}</p>
                                        </div>
                                        {pendingInvitePool && (
                                            <button onClick={() => setPendingInvitePool(null)} style={{ marginLeft: 'auto', fontSize: '8px', color: '#f87171', border: '1px solid #f87171', background: 'none', padding: '2px 4px', cursor: 'pointer' }}>CANCEL</button>
                                        )}
                                    </div>

                                    <div className={styles.userList}>
                                        {discoveredUsers.length > 0 ? discoveredUsers.map((target) => {
                                            const rankInfo = getRankStyle(target.laamPoints || 0);
                                            const displayName = target.username || `${target.walletAddress.slice(0, 4)}...${target.walletAddress.slice(-4)}`;

                                            return (
                                                <div key={target.walletAddress} className={styles.userRow}>
                                                    <div className={styles.userInfo}>
                                                        <span className={styles.userName} style={{ color: '#fff', fontWeight: 900 }}>{displayName}</span>
                                                        <span className={styles.userRank} style={{ color: rankInfo.color, fontSize: '9px', fontWeight: 900 }}>
                                                            RANK: {rankInfo.name.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <button
                                                        disabled={isLinking === target.walletAddress}
                                                        onClick={() => handleSendRequest(target.walletAddress, displayName)}
                                                        className={styles.linkButton}
                                                        style={{ borderColor: pendingInvitePool ? '#eab308' : '' }}
                                                    >
                                                        {isLinking === target.walletAddress ? '...' : pendingInvitePool ? <Zap size={14} /> : <UserPlus size={14} />}
                                                    </button>
                                                </div>
                                            );
                                        }) : (
                                            <p className={styles.emptyText}>SCANNING SECTOR FOR SIGNALS...</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="terminal-card" style={{ padding: '24px' }}>
                                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 900, fontStyle: 'italic' }}>
                                        {activeGame === 'GUESS' ? 'COST: 1 TAG PER ATTEMPT' :
                                            activeGame === 'SPIN' ? 'COST: 5 TAG PER ATTEMPT' :
                                                activeGame === 'DICE' ? 'AUTHORIZED ACCESS ONLY' :
                                                    activeGame === 'RAFFLE' ? 'DATA SCRAPING IN PROGRESS' : 'MISSION: MERGE RIGHT TO EARN'}
                                    </p>
                                </div>
                                {activeGame === 'GUESS' && <GuessGameComponent />}
                                {activeGame === 'SPIN' && <SpinGame />}
                                {activeGame === 'SHOOTER' && <ShooterContainer />}
                                {activeGame === 'DICE' && user && <DiceTerminal user={user} refreshUser={mutate} />}
                                {activeGame === 'RAFFLE' && (
                                    <RaffleLobby
                                        onInviteRequested={(poolId: string) => {
                                            setActiveGame(null);
                                            setPendingInvitePool(poolId);
                                            toast("SELECT OPERATOR TO INVITE", { icon: '📡' });
                                        }}
                                    />
                                )}
                                {activeGame === 'RESISTANCE' && <ResistanceMode />}
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
    <button onClick={onClick} className="terminal-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', gap: '12px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.3s ease', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
        <img src={imageSrc} alt={title} style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
        <div>
            <h3 style={{ margin: 0, fontSize: '12px', color: '#fff', textTransform: 'uppercase' }}>{title}</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 900 }}>{desc}</p>
        </div>
    </button>
);