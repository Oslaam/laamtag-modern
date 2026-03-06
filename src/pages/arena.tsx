import { useState } from 'react';
import ArenaComingSoon from '../components/Arena';
import BattleField from '../components/BattleField';
import ArmoryBattleField from '../components/ArmoryBattleField';
import Head from 'next/head';

export default function ArenaPage() {
    // Default view set to ARENA
    const [view, setView] = useState<'ARENA' | 'BATTLEFIELD' | 'ARMORY'>('ARENA');

    const buttonStyle = (active: boolean) => ({
        padding: '8px 20px',
        fontSize: '10px',
        borderRadius: '6px',
        transition: 'all 0.2s',
        color: active ? '#fff' : '#555',
        background: active ? '#ef4444' : 'transparent',
        border: 'none',
        fontWeight: 900,
        cursor: 'pointer'
    });

    return (
        <>
            <Head>
                <title>{view} | BATTLE TERMINAL</title>
            </Head>

            <main className="min-h-screen bg-black">
                {/* TAB TOGGLE */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', marginBottom: '1rem' }}>
                    <div style={{
                        display: 'flex',
                        background: 'rgba(239, 68, 68, 0.05)',
                        padding: '4px',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                        <button onClick={() => setView('ARENA')} style={buttonStyle(view === 'ARENA')}>PVP ARENA</button>
                        <button onClick={() => setView('BATTLEFIELD')} style={buttonStyle(view === 'BATTLEFIELD')}>BATTLEFIELD</button>
                        <button onClick={() => setView('ARMORY')} style={buttonStyle(view === 'ARMORY')}>ARMORY</button>
                    </div>
                </div>

                {/* VIEW CONDITIONAL RENDERING */}
                {view === 'ARENA' && <ArenaComingSoon />}
                {view === 'BATTLEFIELD' && <BattleField />}
                {view === 'ARMORY' && <ArmoryBattleField />}
            </main>
        </>
    );
}