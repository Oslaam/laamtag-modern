'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { EventBus } from '../game/EventBus';
import { Play, Pause, RotateCcw, ShoppingCart, Zap, Home, Shield, Wind, Heart, ChevronRight, Ticket, ShoppingBag, Coins } from 'lucide-react';
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
    const [isRestarting, setIsRestarting] = useState(false);
    const [statsReady, setStatsReady] = useState(false);
    const [currentHealth, setCurrentHealth] = useState(100);

    const [stats, setStats] = useState({
        laam: 0,
        tag: 0,
        weaponLevel: 1,
        shieldLevel: 1,
        shoeLevel: 1,
        lifeLevel: 1,
        shooterLevel: 1,
        shooterStage: 1
    });

    const fetchUserData = useCallback(async () => {
        if (!publicKey) return;
        try {
            const res = await fetch(`/api/user/stats?wallet=${publicKey.toString()}`);
            const data = await res.json();
            if (res.ok && data) {
                const fetchedStats = {
                    ...data,
                    laam: data.laamPoints,
                    tag: data.tagTickets,
                    shooterLevel: data.shooterLevel || 1,
                    shooterStage: data.shooterStage || 1
                };

                setStats(fetchedStats);
                setStatsReady(true);

                if (sceneReadyRef.current && phaserGame.current) {
                    setTimeout(() => {
                        EventBus.emit('apply-upgrades', {
                            ...fetchedStats,
                            walletAddress: publicKey.toString()
                        });
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

        const handleGameOver = () => {
            setIsGameOver(true);
            toast.error("MISSION FAILED. SYSTEMS OFFLINE.");
        };

        const handleVictory = () => setIsVictory(true);

        const handleStageCleared = async (data: { stage: number }) => {
            setStats(prev => ({ ...prev, shooterStage: data.stage }));
            toast(`STAGE ${data.stage - 1} CLEAR! SHOP OPEN`, {
                icon: '🚀',
                style: { background: '#000', color: '#eab308', border: '1px solid #eab308', fontWeight: 900, fontSize: '10px' }
            });
            setIsShopOpen(true);
            if (publicKey) {
                try {
                    await fetch('/api/games/shooter/sync-stage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ walletAddress: publicKey.toString(), stage: data.stage })
                    });
                } catch (err) { console.error("Sync error:", err); }
            }
        };

        const handleHealthUpdate = (data: { health: number }) => {
            setCurrentHealth(data.health);
        };

        const handleRewardEarned = async (data: { type: string }) => {
            if (!publicKey) return;
            try {
                const res = await fetch('/api/games/shooter/reward', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ walletAddress: publicKey.toString(), type: data.type })
                });
                const result = await res.json();
                if (res.ok) {
                    setStats(prev => ({
                        ...prev,
                        tag: (prev.tag || 0) + (result.tag || 0),
                        laam: (prev.laam || 0) + (result.laam || 0),
                        shooterLevel: data.type === 'BOSS_WIN' ? prev.shooterLevel + 1 : prev.shooterLevel,
                        shooterStage: data.type === 'BOSS_WIN' ? 1 : prev.shooterStage
                    }));
                    toast.success(`+${result.laam || result.tag} RECEIVED`);
                }
            } catch (err) { console.error("Reward error:", err); }
        };

        EventBus.on('health-changed', handleHealthUpdate);
        EventBus.on('current-scene-ready', handleSceneReady);
        EventBus.on('game-over', handleGameOver);
        EventBus.on('victory', handleVictory);
        EventBus.on('stage-cleared', handleStageCleared);
        EventBus.on('level-completed', handleRewardEarned);

        if (publicKey) fetchUserData();

        return () => {
            window.removeEventListener('resize', checkOri);
            EventBus.off('health-changed', handleHealthUpdate);
            EventBus.off('current-scene-ready', handleSceneReady);
            EventBus.off('game-over', handleGameOver);
            EventBus.off('victory', handleVictory);
            EventBus.off('stage-cleared', handleStageCleared);
            EventBus.off('level-completed', handleRewardEarned);

            if (phaserGame.current) {
                phaserGame.current.destroy(true);
                phaserGame.current = null;
                sceneReadyRef.current = false;
                setIsSceneReady(false);
                setIsLoading(false);
            }
        };
    }, [publicKey, fetchUserData]);

    const goHome = () => router.push('/');

    const handleEngage = async () => {
        if (!publicKey) {
            toast.error("CONNECT WALLET FIRST");
            return;
        }
        if (!statsReady) {
            toast.error("LOADING PLAYER DATA...");
            return;
        }
        if (isLoading) return;

        setIsLoading(true);

        try {
            const payRes = await fetch('/api/games/shooter/pay-to-play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    reason: 'VOID_SHOOTER_DEPLOY'
                })
            });

            const payData = await payRes.json();

            if (!payRes.ok) {
                toast.error(payData.error || "INSUFFICIENT TAG");
                setIsLoading(false);
                return;
            }

            const newTagCount = stats.tag - 5;
            setStats(prev => ({ ...prev, tag: newTagCount }));
            toast.success("5 TAG DEDUCTED - SYSTEMS ONLINE");

            sceneReadyRef.current = false;
            let activeGame = phaserGame.current;

            if (!activeGame) {
                activeGame = StartGame("game-container", {
                    level: stats.shooterLevel,
                    stage: stats.shooterStage,
                    stats: {
                        ...stats,
                        tag: newTagCount,
                        walletAddress: publicKey.toString()
                    }
                });
                phaserGame.current = activeGame;
            } else if (isGameOver || isVictory) {
                sceneReadyRef.current = false;
                EventBus.emit('redeploy-player');
                setIsGameOver(false);
                setIsVictory(false);
            }

            let attempts = 0;
            const readyCheck = setInterval(() => {
                attempts++;
                if (sceneReadyRef.current) {
                    const statsWithWallet = {
                        ...stats,
                        tag: newTagCount,
                        walletAddress: publicKey.toString()
                    };

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
                    toast.error("LOAD ERROR: PLEASE REFRESH");
                }
            }, 150);

        } catch (err) {
            console.error("Engage Error:", err);
            toast.error("CONNECTION ERROR");
            setIsLoading(false);
        }
    };

    const restartGame = useCallback(async () => {
        if (!publicKey || isRestarting) return;

        setIsRestarting(true);

        try {
            const payRes = await fetch('/api/games/shooter/pay-to-play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    reason: 'VOID_SHOOTER_REDEPLOY'
                })
            });

            const payData = await payRes.json();

            if (!payRes.ok) {
                toast.error(payData.error || "REDEPLOY FAILED");
                setIsRestarting(false);
                return;
            }

            setStats(prev => ({ ...prev, tag: prev.tag - 5 }));
            toast.success("REDEPLOYED: 5 TAG DEDUCTED", { icon: '🔄' });

            if (phaserGame.current) {
                const statsWithWallet = {
                    ...stats,
                    tag: stats.tag - 5,
                    walletAddress: publicKey.toString()
                };
                const scene = phaserGame.current.scene.scenes[0];
                scene.scene.restart({
                    stats: statsWithWallet,
                    level: stats.shooterLevel,
                    stage: stats.shooterStage
                });

                setTimeout(() => {
                    setIsGameOver(false);
                    setIsVictory(false);
                    setGameStarted(true);
                    setIsRestarting(false);
                    EventBus.emit('start-game');
                }, 800);
            }
        } catch (err) {
            toast.error("CONNECTION ERROR");
            setIsRestarting(false);
        }
    }, [stats, publicKey, isRestarting]);

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
                const updatedStats = {
                    ...stats,
                    tag: stats.tag - result.cost,
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
        <div className={styles.container}>
            <div className={styles.innerFrame}>

                {/* --- UPDATED HUD --- */}
                {(gameStarted || isGameOver) && (
                    <div className={styles.hudContainer}>
                        {/* 1. Health Bar at the top of the HUD stack */}
                        <div className={styles.healthBarContainer}>
                            <div className={styles.healthLabel}>
                                <Heart size={10} fill="#eab308" /> VITAL SIGNS
                            </div>
                            <div className={styles.healthTrack}>
                                <div
                                    className={styles.healthFill}
                                    style={{ width: `${Math.max(0, currentHealth)}%` }}
                                />
                            </div>
                        </div>

                        {/* 2. The Wrapper: This keeps TAG and LAAM side-by-side */}
                        <div className={styles.currencyWrapper}>
                            <div className={styles.currencyItem}>
                                <Ticket className={styles.currencyIcon} size={14} />
                                <span>{(stats?.tag ?? 0).toLocaleString()}</span>
                            </div>

                            <div className={styles.currencyItem}>
                                <Coins className={styles.currencyIcon} size={14} />
                                <span>{(stats?.laam ?? 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- GAME CANVAS --- */}
                <div id="game-container" className={styles.gameContainer} />

                {/* --- CONTROLS --- */}
                {gameStarted && !isGameOver && !isVictory && (
                    <div className={styles.controlBar}>
                        <button onClick={togglePause} className={styles.controlButton}>
                            {isPaused ? (
                                <Play size={18} className={styles.accentIcon} />
                            ) : (
                                <Pause size={18} />
                            )}
                        </button>

                        <button
                            onClick={() => setIsShopOpen(!isShopOpen)}
                            className={`${styles.controlButton} ${isShopOpen ? styles.controlButtonActive : ''
                                }`}
                        >
                            <ShoppingCart size={18} />
                        </button>

                        <button onClick={restartGame} className={styles.controlButton}>
                            <RotateCcw size={18} />
                        </button>
                    </div>
                )}

                {/* --- HOME BUTTON --- */}
                <button onClick={goHome} className={styles.homeButton}>
                    <Home size={18} />
                </button>

                {/* --- START MENU --- */}
                {!gameStarted && (
                    <div className={styles.startOverlay}>
                        <h1 className={styles.mainTitle}>
                            VOID<br />
                            <span>SHOOTER</span>
                        </h1>

                        <div className={styles.startActions}>
                            <button
                                onClick={handleEngage}
                                disabled={isLoading}
                                className={styles.engageButton}
                            >
                                {isLoading ? 'INITIALIZING...' : 'ENGAGE [5 TAG]'}
                            </button>

                            <button
                                onClick={() => (window.location.href = '/games')}
                                className={styles.abortButton}
                            >
                                ← Abort Mission / Return to Terminal
                            </button>
                        </div>
                    </div>
                )}

                {/* --- SHOP PANEL --- */}
                <div
                    className={`${styles.shopPanel} ${isShopOpen ? styles.shopPanelOpen : ''
                        }`}
                >
                    <div className={styles.shopContent}>
                        <h3 className={styles.shopTitle}>
                            <Zap size={20} /> SYSTEM_UPGRADES
                        </h3>

                        <div className={styles.upgradeList}>
                            {[
                                { id: 'weapon', label: 'Plasma Cannon', level: stats.weaponLevel, icon: <Zap size={16} />, color: styles.gold },
                                { id: 'shield', label: 'Energy Shield', level: stats.shieldLevel, icon: <Shield size={16} />, color: styles.blue },
                                { id: 'engine', label: 'Hyper Engine', level: stats.shoeLevel, icon: <Wind size={16} />, color: styles.green },
                                { id: 'hull', label: 'Titanium Hull', level: stats.lifeLevel, icon: <Heart size={16} />, color: styles.red },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => handleUpgrade(item.id)}
                                    className={styles.upgradeCard}
                                >
                                    <div className={styles.upgradeHeader}>
                                        <span className={`${styles.upgradeLabel} ${item.color}`}>
                                            {item.icon} {item.label}
                                        </span>
                                        <span className={styles.upgradeLevel}>LVL {item.level}</span>
                                    </div>

                                    <div className={styles.upgradeDesc}>+</div>

                                    <div className={styles.upgradeCost}>
                                        COST: {Math.floor(1 * Math.pow(1.2, item.level))} TAG
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setIsShopOpen(false);
                            EventBus.emit('resume-stage');
                        }}
                        className={styles.shopExit}
                    >
                        EXIT_TERMINAL <ChevronRight size={14} />
                    </button>
                </div>

                {/* --- GAME OVER --- */}
                {isGameOver && (
                    <div className={styles.gameOverOverlay}>
                        <h2 className={styles.gameOverTitle}>TERMINATED</h2>

                        <div className={styles.gameOverActions}>
                            <button
                                onClick={restartGame}
                                disabled={isRestarting}
                                className={styles.redeployButton}
                            >
                                <RotateCcw
                                    size={20}
                                    className={isRestarting ? styles.spinning : ''}
                                />
                                {isRestarting ? 'CONNECTING...' : 'REDEPLOY [5 TAG]'}
                            </button>

                            {stats.tag < 5 && (
                                <button
                                    onClick={() => router.push('/shop')}
                                    className={styles.buyTagButton}
                                >
                                    <ShoppingBag size={20} />
                                    BUY TAG
                                </button>
                            )}

                            <button
                                onClick={() => (window.location.href = '/games')}
                                className={styles.abortButton}
                                style={{ marginTop: '1.5rem' }}
                            >
                                ← Abort Mission / Return to Terminal
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}