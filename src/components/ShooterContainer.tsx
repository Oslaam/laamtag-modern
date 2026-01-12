'use client';
import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { EventBus } from '../game/EventBus';
import { Play, Pause, ArrowLeft, User, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ShooterContainer({ userStats }: any) {
    const { publicKey } = useWallet();
    const gameRef = useRef<HTMLDivElement>(null);
    const [gameStarted, setGameStarted] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isLandscape, setIsLandscape] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isVictory, setIsVictory] = useState(false);

    // --- RESTART LOGIC ---
    const restartGame = () => {
        const gameInstance = (window as any).game;
        if (gameInstance) {
            const scene = gameInstance.scene.getScene('ShooterScene');
            if (scene) {
                scene.events.off(); // Clear old listeners
                scene.scene.restart();
                if (scene.physics) scene.physics.world.resume();
                setIsPaused(false);
                setIsGameOver(false);
                setIsVictory(false);
                toast.success("MISSION RESTARTED");
            }
        }
    };

    const startGame = () => {
        if (!publicKey) return toast.error("CONNECT WALLET FIRST");
        setGameStarted(true);
        EventBus.emit('start-game');
    };

    const togglePause = () => {
        const newPauseState = !isPaused;
        setIsPaused(newPauseState);
        EventBus.emit('pause-game', newPauseState);
    };

    useEffect(() => {
        setIsMounted(true);
        const checkOri = () => {
            if (typeof window !== 'undefined') {
                setIsLandscape(window.innerWidth > window.innerHeight);
            }
        };

        window.addEventListener('resize', checkOri);
        checkOri();

        let game: any;

        const initPhaser = async () => {
            const Phaser = await import('phaser');
            const { ShooterScene } = await import('../game/scenes/ShooterScene');

            const config: any = {
                type: Phaser.AUTO,
                parent: gameRef.current || undefined,
                width: Math.max(window.innerWidth, 800),
                height: Math.max(window.innerHeight, 600),
                physics: {
                    default: 'arcade',
                    arcade: { gravity: { x: 0, y: 0 }, debug: false }
                },
                scene: [ShooterScene],
                scale: {
                    mode: Phaser.Scale.RESIZE,
                    autoCenter: Phaser.Scale.CENTER_BOTH
                }
            };
            game = new Phaser.Game(config);
            (window as any).game = game;

            if (publicKey) {
                game.registry.set('walletAddress', publicKey.toString());
            }
        };

        initPhaser();

        const onSceneReady = () => {
            if (userStats) {
                EventBus.emit('sync-stats', {
                    level: userStats.shooterLevel || 1,
                    stage: userStats.currentStage || 1,
                    gun: userStats.weaponLevel || 1,
                    shield: userStats.shieldLevel || 0,
                    shoe: userStats.shoeLevel || 1,
                    life: userStats.lifeLevel || 1
                });
            }
        };

        const handleReward = async (data: any) => {
            if (!publicKey) return;
            try {
                const response = await fetch('/api/games/shooter/reward', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        walletAddress: publicKey.toString(),
                        level: data.level,
                        type: data.type
                    })
                });

                const result = await response.json();

                if (result.success) {
                    // Send the exact amounts back to Phaser to show on screen
                    EventBus.emit('reward-processed', {
                        laam: result.laam,
                        tag: result.tag,
                        type: data.type
                    });

                    window.dispatchEvent(new Event('balanceUpdate'));
                }
            } catch (err) { console.error(err); }
        };

        const handlePurchase = async (data: any) => {
            if (!publicKey) return toast.error("Connect Wallet");
            try {
                const res = await fetch('/api/games/shooter/upgrade', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        walletAddress: publicKey.toString(),
                        item: data.item,
                        cost: data.cost
                    })
                });

                const result = await res.json();
                if (result.success) {
                    toast.success(`${data.item.toUpperCase()} UPGRADED!`);
                    if (window.navigator.vibrate) window.navigator.vibrate(50);

                    if (result.success) {
                        EventBus.emit('reward-processed', {
                            laam: result.laam,
                            tag: result.tag,
                            type: data.type,
                            isCritical: result.isCritical // Pass the flag here
                        });

                        window.dispatchEvent(new Event('balanceUpdate'));
                    }
                    window.dispatchEvent(new Event('balanceUpdate'));
                } else {
                    toast.error(result.error || "Purchase failed");
                }
            } catch (err) { console.error("Purchase Error:", err); }
        };

        const handleGameOver = () => {
            setIsGameOver(true);
            if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
        };

        const handleVictory = () => {
            setIsVictory(true);
            if (window.navigator.vibrate) window.navigator.vibrate([50, 30, 50, 30, 100]);
        };

        EventBus.on('current-scene-ready', onSceneReady);
        EventBus.on('level-completed', handleReward);
        EventBus.on('attempt-purchase', handlePurchase);
        EventBus.on('game-over', handleGameOver);
        EventBus.on('victory', handleVictory);

        return () => {
            EventBus.off('current-scene-ready', onSceneReady);
            EventBus.off('level-completed', handleReward);
            EventBus.off('attempt-purchase', handlePurchase);
            EventBus.off('game-over', handleGameOver);
            EventBus.off('victory', handleVictory);
            if (game) {
                game.destroy(true);
                delete (window as any).game;
            }
            window.removeEventListener('resize', checkOri);
        };
    }, [publicKey, userStats]);

    if (!isMounted) return <div className="bg-black h-screen w-full" />;

    if (!isLandscape) {
        return (
            <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[100] p-10 text-center">
                <div className="text-6xl mb-4">📱</div>
                <h1 className="text-white text-2xl font-bold">ROTATE FOR BATTLE</h1>
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
            {/* START SCREEN */}
            {!gameStarted && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/95">
                    <div className="absolute top-8 flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                        <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-black">
                            <User size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest">Pilot Status</p>
                            <p className="text-white font-mono text-sm">
                                {publicKey ? `${publicKey.toString().slice(0, 6)}...${publicKey.toString().slice(-6)}` : 'DISCONNECTED'}
                            </p>
                        </div>
                    </div>

                    <h1 className="text-6xl font-black text-yellow-500 mb-8 italic tracking-tighter drop-shadow-2xl">
                        SPACE SHOOTER
                    </h1>

                    <div className="flex gap-6 mb-10">
                        <div className="p-5 bg-black/40 border border-yellow-500/30 rounded-2xl text-center min-w-[140px] backdrop-blur-sm">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Current Stage</p>
                            <p className="text-3xl font-black text-white">{userStats?.currentStage || 1}</p>
                        </div>
                        <div className="p-5 bg-black/40 border border-yellow-500/30 rounded-2xl text-center min-w-[140px] backdrop-blur-sm">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Weapon Lvl</p>
                            <p className="text-3xl font-black text-white">{userStats?.weaponLevel || 1}</p>
                        </div>
                    </div>

                    <button
                        onClick={startGame}
                        className="group flex items-center gap-3 bg-yellow-500 hover:bg-yellow-400 text-black px-12 py-5 rounded-full font-black text-2xl transition-all shadow-[0_0_30px_rgba(234,179,8,0.3)]"
                    >
                        <Play size={28} fill="black" /> START MISSION
                    </button>

                    <Link href="/games" className="mt-8 text-zinc-500 flex items-center gap-2 hover:text-white transition-colors text-xs uppercase tracking-[0.2em]">
                        <ArrowLeft size={16} /> Back to Hub
                    </Link>
                </div>
            )}

            {/* GAME HUD */}
            {gameStarted && (
                <div className="absolute top-0 left-0 w-full p-6 z-40 flex justify-between items-start pointer-events-none">
                    <div className="flex gap-3 pointer-events-auto">
                        <button
                            onClick={togglePause}
                            className="bg-black/60 p-4 rounded-2xl border border-white/10 backdrop-blur-md text-white hover:bg-yellow-500/20 transition-colors shadow-xl"
                        >
                            {isPaused ? <Play size={24} fill="white" /> : <Pause size={24} fill="white" />}
                        </button>

                        <button
                            onClick={restartGame}
                            className="bg-black/60 p-4 rounded-2xl border border-white/10 backdrop-blur-md text-white hover:bg-red-500/20 transition-colors shadow-xl"
                        >
                            <RotateCcw size={24} />
                        </button>

                        <div className="bg-black/60 px-6 py-2 rounded-2xl border border-white/10 backdrop-blur-md shadow-xl">
                            <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest leading-tight">Stage</p>
                            <p className="font-black text-white text-xl leading-none">{userStats?.currentStage || 1}</p>
                        </div>
                    </div>

                    <div className="bg-black/60 px-6 py-2 rounded-2xl border border-white/10 backdrop-blur-md text-right pointer-events-auto shadow-xl">
                        <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest leading-tight">Operator</p>
                        <p className="font-mono text-sm text-yellow-500 font-bold">
                            {publicKey ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}` : 'UNKNOWN'}
                        </p>
                    </div>
                </div>
            )}

            {/* VICTORY OVERLAY */}
            {isVictory && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-yellow-500/10 backdrop-blur-xl">
                    <div className="bg-gray-900 border-2 border-yellow-500 p-10 rounded-3xl text-center max-w-sm w-full shadow-[0_0_50px_rgba(234,179,8,0.4)] mx-4 relative overflow-hidden">
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-yellow-500/20 blur-3xl rounded-full animate-pulse" />

                        <h2 className="text-5xl font-black text-yellow-500 mb-2 italic">VICTORY</h2>
                        <p className="text-zinc-400 text-xs uppercase tracking-widest mb-8 font-bold">Boss Neutralized • Sector Secured</p>

                        <div className="bg-black/40 border border-white/5 rounded-2xl p-6 mb-8">
                            <p className="text-[10px] text-yellow-500 font-black uppercase mb-1">Rewards Acquired</p>
                            <p className="text-2xl font-mono text-white tracking-tighter">+500 $TAG</p>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={() => {
                                    setIsVictory(false);
                                    const gameInstance = (window as any).game;
                                    const scene = gameInstance.scene.getScene('ShooterScene');
                                    scene.completeLevel();
                                }}
                                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
                            >
                                NEXT MISSION <Play size={20} fill="black" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GAME OVER OVERLAY */}
            {isGameOver && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xl">
                    <div className="bg-gray-900 border-2 border-red-500 p-10 rounded-3xl text-center max-w-sm w-full shadow-[0_0_50px_rgba(239,68,68,0.3)] mx-4">
                        <h2 className="text-5xl font-black text-white mb-2 italic">WASTED</h2>
                        <p className="text-zinc-400 text-xs uppercase tracking-widest mb-8 font-bold">Mission Failed, Operator</p>

                        <div className="space-y-4">
                            <button
                                onClick={() => {
                                    setIsGameOver(false);
                                    restartGame();
                                }}
                                className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                            >
                                <RotateCcw size={20} /> TRY AGAIN
                            </button>

                            <Link
                                href="/games"
                                className="w-full bg-white/5 hover:bg-white/10 text-zinc-400 font-bold py-4 rounded-xl block transition-colors"
                            >
                                ABANDON MISSION
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            <div ref={gameRef} id="game-container" className="w-full h-full" />
        </div>
    );
}