import { useState, useEffect, useCallback } from 'react';
import SeekerGuard from '../components/SeekerGuard';
import GuessGameComponent from '../components/GuessGame';
import SpinGame from '../components/SpinGame';
import DiceTerminal from '../components/DiceTerminal';
import RaffleLobby from '../components/RaffleLobby';
import ThuggerGrand from '../components/ThuggerGrand';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
const ShooterContainer = dynamic(
    () => import('../components/ShooterContainer'),
    { ssr: false }
);
import LootVault from '../components/LootVault';
import HistoryModal from '../components/HistoryModal';
import { Toaster } from 'react-hot-toast';
import { History, ChevronLeft } from 'lucide-react';

export default function GamesPage() {
    // Added 'RAFFLE' to the activeGame type
    const [activeGame, setActiveGame] = useState<'GUESS' | 'SPIN' | 'SHOOTER' | 'DICE' | 'RAFFLE' | 'THUGGER' | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [user, setUser] = useState<any>(null);

    // 2. Initialize the wallet hook
    const { publicKey } = useWallet();

    // 3. Update fetchUser to use the wallet address
    const fetchUser = useCallback(async () => {
        if (!publicKey) return;

        try {
            const res = await fetch(`/api/user/me?address=${publicKey.toBase58()}`);
            const data = await res.json();

            if (res.ok) {
                setUser(data);
            }
        } catch (err) {
            console.error("Failed to fetch user:", err);
        }
    }, [publicKey]);

    // 4. Update useEffect to trigger when the wallet connects
    useEffect(() => {
        fetchUser();
    }, [fetchUser, publicKey]);

    const mutate = () => fetchUser();

    return (
        <SeekerGuard>
            <div className="main-content">
                <Toaster position="bottom-center" />

                <div className="content-wrapper">
                    {/* Header Section */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                        <div style={{ flex: 1 }}>
                            {activeGame && (
                                <button
                                    onClick={() => setActiveGame(null)}
                                    style={{ background: 'none', border: 'none', color: '#eab308', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 900 }}
                                >
                                    <ChevronLeft size={14} /> EXIT MODULE
                                </button>
                            )}
                        </div>
                        <div style={{ textAlign: 'center', flex: 2 }}>
                            <h1 className="page-title" style={{ color: '#eab308', margin: 0 }}>
                                Gaming Terminal
                            </h1>
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
                            /* GRID REMAINS 2 COLUMNS */
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <ModuleCard
                                    title="Frequency Jammer"
                                    desc="1 TAG PER ATTEMPT"
                                    imageSrc="/assets/images/jammer.png"
                                    onClick={() => setActiveGame('GUESS')}
                                />
                                <ModuleCard
                                    title="The Reactor"
                                    desc="5 TAG PER ATTEMPT"
                                    imageSrc="/assets/images/reactor.png"
                                    onClick={() => setActiveGame('SPIN')}
                                />
                                <ModuleCard
                                    title="Void Shooter"
                                    desc="ELIMINATE TO EARN"
                                    imageSrc="/assets/images/shooter.jpg"
                                    onClick={() => setActiveGame('SHOOTER')}
                                />
                                <ModuleCard
                                    title="Probability Matrix"
                                    desc="HIGH STAKES RECOVERY"
                                    imageSrc="/assets/images/dice.jpg"
                                    onClick={() => setActiveGame('DICE')}
                                />
                                <ModuleCard
                                    title="Data Scraper Raffle"
                                    desc="POOL ENTRY & REFUNDS"
                                    imageSrc="/assets/images/raffle.png"
                                    onClick={() => setActiveGame('RAFFLE')}
                                />
                                <ModuleCard
                                    title="Thugger Grand"
                                    desc="ELIMATES THE ENEMIES TO EARN"
                                    imageSrc="/assets/images/thugger.jpg"
                                    onClick={() => setActiveGame('THUGGER')}
                                />
                            </div>
                        ) : (
                            <div className="terminal-card" style={{ padding: '24px' }}>
                                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 900, fontStyle: 'italic' }}>
                                        {activeGame === 'GUESS' ? 'COST: 1 TAG PER ATTEMPT' :
                                            activeGame === 'SPIN' ? 'COST: 5 TAG PER ATTEMPT' :
                                                activeGame === 'DICE' ? 'AUTHORIZED ACCESS ONLY' :
                                                    activeGame === 'RAFFLE' ? 'DATA SCRAPING IN PROGRESS' :
                                                        'MISSION: ELIMINATE TO EARN'}
                                    </p>
                                </div>

                                {activeGame === 'GUESS' && <GuessGameComponent />}
                                {activeGame === 'SPIN' && <SpinGame />}
                                {activeGame === 'SHOOTER' && <ShooterContainer />}
                                {activeGame === 'DICE' && user && <DiceTerminal user={user} refreshUser={mutate} />}
                                {activeGame === 'RAFFLE' && <RaffleLobby />}
                                 {/* {activeGame === 'THUGGER' && <ThuggerGrand />} */}

                                <div style={{ marginTop: '32px', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <h4 style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '12px' }}>
                                        {activeGame === 'GUESS' ? 'Jammer Rewards' :
                                            activeGame === 'SPIN' ? 'Reactor Loot' :
                                                activeGame === 'DICE' ? 'Matrix Yield' :
                                                    activeGame === 'RAFFLE' ? 'Scraper Pool' : 'Void Rewards'}
                                    </h4>

                                    {activeGame === 'DICE' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <LootRow label="Hacker Tier" value="UP TO 2000 $SKR" highlight />
                                            <LootRow label="Expert Tier" value="UP TO 500 $SKR" />
                                            <LootRow label="Standard Tier" value="UP TO 100 $SKR" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <p style={{ marginTop: '48px', textAlign: 'center', fontSize: '8px', color: 'rgba(255,255,255,0.2)', fontWeight: 900, letterSpacing: '0.2em' }}>
                        AUTHORIZED GAMING MODULE // LAAM TERMINAL V.01
                    </p>
                </div>

                <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
            </div>
        </SeekerGuard>
    );
}

const ModuleCard = ({ title, desc, imageSrc, onClick }: any) => (
    <button
        onClick={onClick}
        className="terminal-card"
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 16px',
            gap: '12px',
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.3s ease',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.02)'
        }}
    >
        <img src={imageSrc} alt={title} style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
        <div>
            <h3 style={{ margin: 0, fontSize: '12px', color: '#fff', textTransform: 'uppercase' }}>{title}</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 900 }}>{desc}</p>
        </div>
    </button>
);

const RewardBox = ({ label, value }: any) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ color: '#eab308', fontSize: '8px', fontWeight: 900, margin: 0 }}>{label}</p>
        <p style={{ fontSize: '12px', fontWeight: 900, margin: '4px 0 0 0' }}>{value}</p>
    </div>
);

const LootRow = ({ label, value, highlight }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', margin: 0, color: highlight ? '#fff' : 'rgba(255,255,255,0.4)' }}>{label}</p>
        <p style={{ fontSize: '10px', fontWeight: 900, fontStyle: 'italic', margin: 0, color: highlight ? '#eab308' : '#fff' }}>{value}</p>
    </div>
);