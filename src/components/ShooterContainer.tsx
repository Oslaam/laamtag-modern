'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { EventBus } from '../game/EventBus';
import { Play, Pause, RotateCcw, ShoppingCart, Zap, Home, Shield, Wind, Heart, ChevronRight, Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import styles from '../styles/ShooterContainer.module.css';
import { StartGame } from '../game/main';

export default function ShooterContainer() {
    const { publicKey } = useWallet();
    const router = useRouter();
    const phaserGame = useRef<any>(null);
    const sceneReadyRef = useRef(false);

    const [isSceneReady, setIsSceneReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isLandscape, setIsLandscape] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isVictory, setIsVictory] = useState(false);
    const [isShopOpen, setIsShopOpen] = useState(false);

    const [stats, setStats] = useState({
        laam: 0,
        tag: 0,
        weaponLevel: 1,
        shieldLevel: 1,
        shoeLevel: 1,
        lifeLevel: 1
    });

    const fetchUserData = useCallback(async () => {
        if (!publicKey) return;
        try {
            const res = await fetch(`/api/user/stats?wallet=${publicKey.toString()}`);
            const data = await res.json();
            if (res.ok && data) {
                setStats(data);
                const dataWithWallet = { ...data, walletAddress: publicKey.toString() };

                if (sceneReadyRef.current && phaserGame.current) {
                    setTimeout(() => {
                        if (phaserGame.current) {
                            EventBus.emit('apply-upgrades', dataWithWallet);
                        }
                    }, 200);
                }
            }
        } catch (err) {
            console.error("Failed to fetch stats:", err);
        }
    }, [publicKey]);

    useEffect(() => {
        setIsMounted(true);
        const checkOri = () => setIsLandscape(window.innerWidth > window.innerHeight);
        window.addEventListener('resize', checkOri);

        const handleSceneReady = () => {
            sceneReadyRef.current = true;
            setIsSceneReady(true);
        };

        const handleGameOver = () => setIsGameOver(true);
        const handleVictory = () => setIsVictory(true);

        const handleStageCleared = (data: any) => {
            toast(`STAGE ${data.stage - 1} CLEAR! SHOP OPEN`, {
                icon: '🚀',
                style: { background: '#000', color: '#eab308', border: '1px solid #eab308', fontWeight: 900, fontSize: '10px' }
            });
            setIsShopOpen(true);
        };

        const handleRewardEarned = (data: { type: string }) => {
            if (data.type === 'SPECIAL_BOMB_TAG') {
                setStats(prev => ({ ...prev, tag: (prev.tag || 0) + 1 }));
            } else if (data.type === 'SPECIAL_BOMB_LAAM') {
                setStats(prev => ({ ...prev, laam: (prev.laam || 0) + 10 }));
            }
        };

        EventBus.on('current-scene-ready', handleSceneReady);
        EventBus.on('game-over', handleGameOver);
        EventBus.on('victory', handleVictory);
        EventBus.on('stage-cleared', handleStageCleared);
        EventBus.on('level-completed', handleRewardEarned);

        if (publicKey) fetchUserData();

        return () => {
            window.removeEventListener('resize', checkOri);
            EventBus.off('current-scene-ready', handleSceneReady);
            EventBus.off('game-over', handleGameOver);
            EventBus.off('victory', handleVictory);
            EventBus.off('stage-cleared', handleStageCleared);
            EventBus.off('level-completed', handleRewardEarned);

            if (phaserGame.current) {
                phaserGame.current.destroy(true);
                phaserGame.current = null;
                sceneReadyRef.current = false;
            }
        };
    }, [publicKey, fetchUserData]);

    const goHome = () => router.push('/');

    const handleEngage = () => {
        if (isLoading) return;
        setIsLoading(true);

        let activeGame = phaserGame.current;
        if (!activeGame) {
            activeGame = StartGame("game-container");
            phaserGame.current = activeGame;
        }

        let attempts = 0;
        const readyCheck = setInterval(() => {
            attempts++;
            if (activeGame && sceneReadyRef.current) {
                const statsWithWallet = { ...stats, walletAddress: publicKey?.toString() };
                EventBus.emit('apply-upgrades', statsWithWallet);
                EventBus.emit('start-game');
                setGameStarted(true);
                setIsLoading(false);
                clearInterval(readyCheck);
                return;
            }
            if (attempts > 60) {
                setIsLoading(false);
                clearInterval(readyCheck);
                toast.error("LOAD ERROR: PLEASE REFRESH PAGE");
            }
        }, 150);
    };

    const restartGame = useCallback(() => {
        if (phaserGame.current) {
            const statsWithWallet = { ...stats, walletAddress: publicKey?.toString() };
            EventBus.emit('start-game');
            EventBus.emit('apply-upgrades', statsWithWallet);
            setIsGameOver(false);
            setIsVictory(false);
            setIsPaused(false);
            setIsShopOpen(false);
            setGameStarted(true);
        }
    }, [stats, publicKey]);

    const togglePause = () => {
        const newPauseState = !isPaused;
        setIsPaused(newPauseState);
        EventBus.emit('pause-game', newPauseState);
    };

    const handleUpgrade = async (itemType: string) => {
        if (!publicKey) return toast.error("CONNECT WALLET");
        try {
            const res = await fetch('/api/games/shooter/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    item: itemType
                })
            });
            const result = await res.json();

            if (res.ok) {
                toast.success("SYSTEM UPGRADED!", {
                    style: { background: '#000', color: '#eab308', border: '1px solid #eab308' }
                });
                const updatedStats = {
                    ...stats,
                    tag: result.remainingTag,
                    weaponLevel: itemType === 'weapon' ? result.newLevel : stats.weaponLevel,
                    shieldLevel: itemType === 'shield' ? result.newLevel : stats.shieldLevel,
                    shoeLevel: itemType === 'engine' ? result.newLevel : stats.shoeLevel,
                    lifeLevel: itemType === 'hull' ? result.newLevel : stats.lifeLevel,
                };
                setStats(updatedStats);
                EventBus.emit('apply-upgrades', { ...updatedStats, walletAddress: publicKey.toString() });
            } else {
                toast.error(result.error || "INSUFFICIENT TAG");
            }
        } catch (err) {
            toast.error("UPGRADE FAILED: SERVER ERROR");
        }
    };

    if (!isMounted) return null;

    if (!isLandscape) {
        return (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                <h2 style={{ color: '#fff', fontWeight: 900, fontStyle: 'italic', fontSize: '20px', textTransform: 'uppercase' }}>ROTATE FOR BATTLE</h2>
            </div>
        );
    }

    return (
        <div className={styles.container} style={{ backgroundColor: '#050505' }}>
            <div className={`${styles.innerFrame} relative overflow-hidden`} style={{ border: '4px solid #111', boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)' }}>

                {/* Stats Display - Inspired by Ref 2 Terminal Card style */}
                {gameStarted && (
                    <div style={{ position: 'absolute', top: '16px', right: '100px', zIndex: 10000, display: 'flex', gap: '12px' }}>
                        <div style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid #eab308', padding: '6px 16px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(8px)' }}>
                            <Ticket size={12} style={{ color: '#eab308' }} />
                            <span style={{ color: '#fff', fontWeight: 900, fontSize: '10px', fontFamily: 'monospace' }}>TAG: {(stats?.tag ?? 0).toLocaleString()}</span>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid #eab308', padding: '6px 16px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(8px)' }}>
                            <Zap size={12} style={{ color: '#eab308' }} />
                            <span style={{ color: '#fff', fontWeight: 900, fontSize: '10px', fontFamily: 'monospace' }}>LAAM: {(stats?.laam ?? 0).toLocaleString()}</span>
                        </div>
                    </div>
                )}

                <div id="game-container" className="w-full h-full absolute inset-0 z-[1]" />

                {/* Control Buttons - Ref 1 Mechanical Hub style */}
                {gameStarted && !isGameOver && !isVictory && (
                    <div style={{ position: 'absolute', top: '16px', left: '24px', zIndex: 10001, display: 'flex', gap: '10px' }}>
                        <button onClick={togglePause} style={{ background: '#111', border: '1px solid #333', padding: '10px', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 0 #000' }}>
                            {isPaused ? <Play size={18} fill="#eab308" color="#eab308" /> : <Pause size={18} fill="#fff" />}
                        </button>
                        <button onClick={() => setIsShopOpen(!isShopOpen)} style={{ background: isShopOpen ? '#991b1b' : '#111', border: '1px solid #333', padding: '10px', borderRadius: '8px', color: '#fff', boxShadow: isShopOpen ? 'none' : '0 4px 0 #000', transform: isShopOpen ? 'translateY(2px)' : 'none' }}>
                            <ShoppingCart size={18} />
                        </button>
                        <button onClick={restartGame} style={{ background: '#111', border: '1px solid #333', padding: '10px', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 0 #000' }}>
                            <RotateCcw size={18} />
                        </button>
                    </div>
                )}

                {/* Entry Screen - Inspired by Ref 1 Reactor Core */}
                {!gameStarted && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 20000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, #111 0%, #000 100%)' }}>
                        <div style={{ position: 'relative', marginBottom: '40px' }}>
                            <div style={{ position: 'absolute', inset: '-20px', background: 'rgba(234, 179, 8, 0.1)', filter: 'blur(30px)', borderRadius: '50%' }} />
                            <h1 style={{ position: 'relative', fontSize: '64px', fontWeight: 900, color: '#eab308', fontStyle: 'italic', letterSpacing: '-4px', textAlign: 'center', textShadow: '0 0 20px rgba(234,179,8,0.5)' }}>
                                VOID<br /><span style={{ color: '#fff' }}>SHOOTER</span>
                            </h1>
                        </div>
                        <button
                            onClick={handleEngage}
                            disabled={isLoading}
                            style={{
                                padding: '20px 60px',
                                background: isLoading ? '#1f2937' : '#991b1b',
                                color: '#fff',
                                borderRadius: '4px',
                                border: 'none',
                                fontWeight: 900,
                                fontSize: '24px',
                                letterSpacing: '4px',
                                boxShadow: isLoading ? 'none' : '0 8px 0 #450a0a',
                                transform: isLoading ? 'translateY(4px)' : 'none',
                                transition: 'all 0.1s'
                            }}
                        >
                            {isLoading ? "INITIALIZING..." : "ENGAGE"}
                        </button>
                    </div>
                )}

                <button onClick={goHome} style={{ position: 'absolute', top: '16px', right: '24px', zIndex: 10001, background: '#111', border: '1px solid #333', padding: '10px', borderRadius: '50%', color: '#fff' }}>
                    <Home size={18} />
                </button>

                {/* Shop Panel - Ref 2 Terminal style */}
                <div className={`${styles.shopPanel} ${isShopOpen ? styles.shopPanelOpen : ''}`} style={{ zIndex: 20001, background: '#080808', borderLeft: '2px solid #1a1a1a' }}>
                    <div style={{ padding: '24px', paddingTop: '80px', height: '100%', overflowY: 'auto' }}>
                        <h3 style={{ color: '#eab308', fontWeight: 900, fontStyle: 'italic', fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #1a1a1a', paddingBottom: '10px' }}>
                            <Zap size={20} /> SYSTEM_UPGRADES
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { id: 'weapon', label: 'Plasma Cannon', level: stats.weaponLevel, icon: <Zap size={16} />, color: '#eab308', desc: 'ROF +20%' },
                                { id: 'shield', label: 'Energy Shield', level: stats.shieldLevel, icon: <Shield size={16} />, color: '#60a5fa', desc: 'DEF +15%' },
                                { id: 'engine', label: 'Hyper Engine', level: stats.shoeLevel, icon: <Wind size={16} />, color: '#4ade80', desc: 'SPD +10%' },
                                { id: 'hull', label: 'Titanium Hull', level: stats.lifeLevel, icon: <Heart size={16} />, color: '#f87171', desc: 'HP +25%' },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleUpgrade(item.id)}
                                    style={{
                                        width: '100%', background: '#000', border: '1px solid #1a1a1a', padding: '16px', borderRadius: '8px',
                                        display: 'flex', flexDirection: 'column', textAlign: 'left', gap: '4px', transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                        <span style={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', color: item.color, fontSize: '12px', textTransform: 'uppercase' }}>
                                            {item.icon} {item.label}
                                        </span>
                                        <span style={{ color: '#444', fontSize: '10px', fontWeight: 900, fontFamily: 'monospace' }}>LVL {item.level}</span>
                                    </div>
                                    <div style={{ fontSize: '9px', color: '#666', fontWeight: 500 }}>{item.desc}</div>
                                    <div style={{ marginTop: '8px', background: 'rgba(234,179,8,0.1)', color: '#eab308', fontSize: '9px', padding: '4px 8px', borderRadius: '2px', fontWeight: 900, alignSelf: 'flex-start' }}>
                                        COST: {Math.floor(1 * Math.pow(1.2, item.level))} TAG
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <button onClick={() => setIsShopOpen(false)} style={{ position: 'absolute', bottom: 0, width: '100%', padding: '20px', borderTop: '1px solid #1a1a1a', color: '#444', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        EXIT_TERMINAL <ChevronRight size={14} />
                    </button>
                </div>

                {/* Game Over Overlay - High contrast "Terminated" */}
                {isGameOver && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 30000, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                        <h2 style={{ color: '#991b1b', fontSize: '72px', fontWeight: 900, fontStyle: 'italic', marginBottom: '20px', letterSpacing: '-4px' }}>TERMINATED</h2>
                        <button onClick={restartGame} style={{ background: '#fff', color: '#000', padding: '16px 40px', borderRadius: '4px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', textTransform: 'uppercase' }}>
                            <RotateCcw size={20} /> REDEPLOY
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}