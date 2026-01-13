import { useState } from 'react';
import SeekerGuard from '../components/SeekerGuard';
import GuessGameComponent from '../components/GuessGame';
import SpinGame from '../components/SpinGame';
import ShooterContainer from '../components/ShooterContainer';
import LootVault from '../components/LootVault';
import HistoryModal from '../components/HistoryModal';
import { Toaster } from 'react-hot-toast';
import { History } from 'lucide-react';

export default function GamesPage() {
    const [activeGame, setActiveGame] = useState<'GUESS' | 'SPIN' | 'SHOOTER'>('GUESS');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    return (
        <SeekerGuard>
            <div className="main-content">
                <Toaster position="bottom-center" />

                <div className="content-wrapper">
                    {/* Header Section */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '40px'
                    }}>
                        <div style={{ flex: 1 }}></div>
                        <div style={{ textAlign: 'center', flex: 2 }}>
                            <h1 className="page-title" style={{ color: '#eab308', margin: 0 }}>
                                Gaming Terminal
                            </h1>
                            <p className="terminal-desc" style={{ fontSize: '10px', marginTop: '4px' }}>
                                SELECT MODULE
                            </p>
                        </div>

                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setIsHistoryOpen(true)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    padding: '10px',
                                    color: '#666',
                                    cursor: 'pointer'
                                }}
                            >
                                <History size={18} />
                            </button>
                        </div>
                    </div>

                    <LootVault />

                    <div style={{ marginTop: '40px' }}>
                        {/* Game Selector Tabs */}
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '4px',
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            marginBottom: '32px'
                        }}>
                            <button
                                onClick={() => setActiveGame('GUESS')}
                                style={tabStyle(activeGame === 'GUESS')}
                            >
                                Frequency Jammer
                            </button>
                            <button
                                onClick={() => setActiveGame('SPIN')}
                                style={tabStyle(activeGame === 'SPIN')}
                            >
                                The Reactor
                            </button>
                            <button
                                onClick={() => setActiveGame('SHOOTER')}
                                style={tabStyle(activeGame === 'SHOOTER')}
                            >
                                Void Shooter
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="terminal-card" style={{ padding: '24px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 900, fontStyle: 'italic' }}>
                                    {activeGame === 'GUESS' ? 'COST: 1 TAG PER ATTEMPT' :
                                        activeGame === 'SPIN' ? 'COST: 5 TAG PER ATTEMPT' :
                                            'MISSION: ELIMINATE TO EARN'}
                                </p>
                            </div>

                            {activeGame === 'GUESS' && <GuessGameComponent />}
                            {activeGame === 'SPIN' && <SpinGame />}
                            {activeGame === 'SHOOTER' && <ShooterContainer />}

                            {/* Rewards Information */}
                            <div style={{
                                marginTop: '32px',
                                background: 'rgba(0,0,0,0.3)',
                                padding: '16px',
                                borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <h4 style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '12px' }}>
                                    {activeGame === 'GUESS' ? 'Jammer Rewards' : activeGame === 'SPIN' ? 'Reactor Loot' : 'Void Rewards'}
                                </h4>

                                {activeGame === 'GUESS' ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                        <RewardBox label="EASY" value="1000 LAAM" />
                                        <RewardBox label="NORMAL" value="2000 LAAM" />
                                        <RewardBox label="HARD" value="5000 LAAM" />
                                    </div>
                                ) : activeGame === 'SPIN' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <LootRow label="Jackpot" value="2,500 LAAM" highlight />
                                        <LootRow label="Rare Find" value="200 LAAM" />
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <RewardBox label="ENEMY" value="10 LAAM" />
                                        <RewardBox label="ELITE" value="50 LAAM" />
                                    </div>
                                )}
                            </div>
                        </div>
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

// Helpers
const tabStyle = (isActive: boolean) => ({
    flex: 1,
    background: isActive ? '#eab308' : 'transparent',
    color: isActive ? '#000' : '#666',
    border: 'none',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 900 as const,
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
});

const RewardBox = ({ label, value }: any) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ color: '#eab308', fontSize: '8px', fontWeight: 900, margin: 0 }}>{label}</p>
        <p style={{ fontSize: '12px', fontWeight: 900, margin: '4px 0 0 0' }}>{value}</p>
    </div>
);

const LootRow = ({ label, value, highlight }: any) => (
    <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.05)'
    }}>
        <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', margin: 0, color: highlight ? '#fff' : 'rgba(255,255,255,0.4)' }}>{label}</p>
        <p style={{ fontSize: '10px', fontWeight: 900, fontStyle: 'italic', margin: 0, color: highlight ? '#eab308' : '#fff' }}>{value}</p>
    </div>
);