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

                // IMPORTANT: Inject walletAddress into the data object passed to Phaser
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
            toast(`STAGE ${data.stage - 1} CLEAR! SHOP OPEN`, { icon: '🚀' });
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
                // Ensure wallet is included during start handshake
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
                toast.success("SYSTEM UPGRADED!");
                const updatedStats = {
                    ...stats,
                    tag: result.remainingTag,
                    weaponLevel: itemType === 'weapon' ? result.newLevel : stats.weaponLevel,
                    shieldLevel: itemType === 'shield' ? result.newLevel : stats.shieldLevel,
                    shoeLevel: itemType === 'engine' ? result.newLevel : stats.shoeLevel,
                    lifeLevel: itemType === 'hull' ? result.newLevel : stats.lifeLevel,
                };
                setStats(updatedStats);
                // Pass wallet through here too
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
            <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
                <h2 className="text-white font-black italic text-xl">ROTATE FOR BATTLE</h2>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={`${styles.innerFrame} relative overflow-hidden`}>
                {gameStarted && (
                    <div className="absolute top-4 right-24 z-[100] flex gap-3">
                        <div className="bg-black/60 border border-pink-500/50 px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md">
                            <Ticket size={14} className="text-pink-500" />
                            <span className="text-white font-bold text-xs">TAG: {(stats?.tag ?? 0).toLocaleString()}</span>
                        </div>
                        <div className="bg-black/60 border border-yellow-500/50 px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md">
                            <Zap size={14} className="text-yellow-500" />
                            <span className="text-white font-bold text-xs">LAAM: {(stats?.laam ?? 0).toLocaleString()}</span>
                        </div>
                    </div>
                )}

                <div id="game-container" className="w-full h-full absolute inset-0 z-[1]" />

                {gameStarted && !isGameOver && !isVictory && (
                    <div className="absolute top-4 left-6 z-[101] flex gap-2">
                        <button onClick={togglePause} className="bg-black/50 p-3 rounded-xl border border-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-colors">
                            {isPaused ? <Play size={20} fill="white" /> : <Pause size={20} fill="white" />}
                        </button>
                        <button onClick={() => setIsShopOpen(!isShopOpen)} className={`p-3 rounded-xl border border-white/10 backdrop-blur-md transition-all ${isShopOpen ? 'bg-pink-600 text-white scale-105' : 'bg-black/50 text-white hover:bg-white/20'}`}>
                            <ShoppingCart size={20} />
                        </button>
                        <button onClick={restartGame} className="bg-black/50 p-3 rounded-xl border border-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-colors">
                            <RotateCcw size={20} />
                        </button>
                    </div>
                )}

                {!gameStarted && (
                    <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/95">
                        <div className="relative mb-8">
                            <div className="absolute -inset-4 bg-yellow-500/20 blur-xl rounded-full animate-pulse" />
                            <h1 className="relative text-7xl font-black text-yellow-500 italic tracking-tighter text-center">VOID SHOOTER</h1>
                        </div>

                        <button
                            onClick={handleEngage}
                            disabled={isLoading}
                            className={`px-16 py-5 rounded-full font-black text-3xl transition-all shadow-[0_0_30px_rgba(234,179,8,0.3)] ${isLoading ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed scale-95' : 'bg-yellow-500 text-black hover:scale-110 hover:bg-yellow-400 active:scale-95'}`}
                        >
                            {isLoading ? "SYNCING..." : "ENGAGE"}
                        </button>
                    </div>
                )}

                <button onClick={goHome} className="absolute top-4 right-6 z-[101] bg-white/10 p-3 rounded-full text-white backdrop-blur-md hover:bg-red-500/80 transition-colors">
                    <Home size={20} />
                </button>

                <div className={`${styles.shopPanel} ${isShopOpen ? styles.shopPanelOpen : ''} z-[105]`}>
                    <div className="p-6 pt-20 flex-1 overflow-y-auto">
                        <h3 className="text-pink-500 font-black italic text-2xl mb-2 flex items-center gap-2">
                            <Ticket size={24} /> UPGRADES
                        </h3>
                        <div className="space-y-4">
                            {[
                                { id: 'weapon', label: 'Plasma Cannon', level: stats.weaponLevel, icon: <Zap size={18} />, color: 'text-yellow-500', desc: 'Higher Fire Rate' },
                                { id: 'shield', label: 'Energy Shield', level: stats.shieldLevel, icon: <Shield size={18} />, color: 'text-blue-400', desc: 'Damage Reduction' },
                                { id: 'engine', label: 'Hyper Engine', level: stats.shoeLevel, icon: <Wind size={18} />, color: 'text-green-400', desc: 'Movement Speed' },
                                { id: 'hull', label: 'Titanium Hull', level: stats.lifeLevel, icon: <Heart size={18} />, color: 'text-red-500', desc: 'Max Durability' },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleUpgrade(item.id)}
                                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-start hover:border-pink-500/50 hover:bg-white/10 transition-all active:scale-95 group"
                                >
                                    <div className="flex justify-between w-full mb-1">
                                        <span className={`font-bold flex items-center gap-2 ${item.color} group-hover:text-white`}>
                                            {item.icon} {item.label}
                                        </span>
                                        <span className="text-zinc-500 text-xs font-mono">LVL {item.level}</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 font-medium mb-2">{item.desc}</div>
                                    <div className="bg-pink-500/10 text-pink-500 text-[10px] px-2 py-1 rounded-md font-black italic">
                                        COST: {Math.floor(1 * Math.pow(1.2, item.level))} TAG
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <button onClick={() => setIsShopOpen(false)} className="p-6 border-t border-white/5 text-zinc-500 flex items-center justify-center gap-2 hover:text-white font-black uppercase text-xs transition-colors">
                        Return to Combat <ChevronRight size={16} />
                    </button>
                </div>

                {isGameOver && (
                    <div className="absolute inset-0 z-[300] bg-black/90 flex flex-col items-center justify-center backdrop-blur-md">
                        <h2 className="text-red-500 text-6xl font-black italic mb-2 tracking-tighter">TERMINATED</h2>
                        <button onClick={restartGame} className="bg-white text-black px-10 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-zinc-200 transition-colors">
                            <RotateCcw size={22} /> REDEPLOY
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}