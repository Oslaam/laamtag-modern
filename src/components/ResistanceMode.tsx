import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import toast from 'react-hot-toast';
import styles from '../styles/ResistanceMode.module.css';

// Umi & Metaplex Imports
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import {
    mplToolbox,
    transferTokens,
    findAssociatedTokenPda,
    setComputeUnitPrice
} from "@metaplex-foundation/mpl-toolbox";

const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

const COLS = 16;
const ROWS = 12;
const INTERNAL_RES = 512;
const SCALE = INTERNAL_RES / 128;
const CELL_SIZE = 8 * SCALE;
const HEADER_OFFSET = 16 * SCALE;
const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";

export default function ResistanceMode() {
    const { publicKey, connected, wallet } = useWallet();
    const [grid, setGrid] = useState<number[]>([]);
    const [selectorPos, setSelectorPos] = useState({ x: 0, y: 0 });
    const [selectionStart, setSelectionStart] = useState<{ x: number, y: number } | null>(null);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(120);
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAMEOVER'>('IDLE');
    const [leaderboardType, setLeaderboardType] = useState<'daily' | 'overall'>('daily');
    const [moveHistory, setMoveHistory] = useState<any[]>([]);
    const [gameStartTime, setGameStartTime] = useState<number>(0);
    const [level, setLevel] = useState(1);
    const [missionRewards, setMissionRewards] = useState({ laam: 1000, tag: 20 });
    const [showRewardOverlay, setShowRewardOverlay] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [userBestScore, setUserBestScore] = useState(0);
    const [dailyResetTime, setDailyResetTime] = useState("");
    const [daysSinceStart, setDaysSinceStart] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const moveInterval = useRef<NodeJS.Timeout | null>(null);
    const moveDelay = useRef<NodeJS.Timeout | null>(null);

    // --- UPDATED: UTC RESET TIMER ---
    useEffect(() => {
        const startDate = new Date("2026-02-10");

        const timer = setInterval(() => {
            const now = new Date();

            // Calculate Days Since Launch (UTC)
            const diffTime = Math.abs(now.getTime() - startDate.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            setDaysSinceStart(diffDays);

            // Calculate Time Until UTC Midnight
            const nextReset = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate() + 1,
                0, 0, 0
            ));

            const diff = nextReset.getTime() - now.getTime();

            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / 1000 / 60) % 60);
            const s = Math.floor((diff / 1000) % 60);

            setDailyResetTime(`${h}h ${m}m ${s}s`);

            // Auto-refresh leaderboard when clock hits zero
            if (h === 0 && m === 0 && s === 0) {
                fetchLeaderboard();
            }
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchLeaderboard = useCallback(async () => {
        try {
            const walletParam = publicKey ? `&walletAddress=${publicKey.toBase58()}` : '';
            const res = await axios.get(`/api/games/resistance-mode?type=${leaderboardType}${walletParam}`);
            setLeaderboard(res.data.leaderboard);
            setUserBestScore(res.data.userBest || 0);
        } catch (e) { console.error("Leaderboard Error", e); }
    }, [leaderboardType, publicKey]);

    const checkUnlockStatus = useCallback(async () => {
        if (!publicKey) return;
        try {
            const res = await axios.get(`/api/user/${publicKey.toBase58()}`);
            setIsUnlocked(res.data.hasResistanceUnlocked);
        } catch (e) { console.error(e); }
    }, [publicKey]);

    useEffect(() => {
        fetchLeaderboard();
        if (connected) checkUnlockStatus();
    }, [connected, publicKey, fetchLeaderboard, checkUnlockStatus]);

    const initGame = useCallback(() => {
        setGrid(Array.from({ length: COLS * ROWS }, () => Math.floor(Math.random() * 9) + 1));
        setScore(0);
        setLevel(1);
        setMoveHistory([]);
        setGameStartTime(Date.now());
        setMissionRewards({ laam: 1000, tag: 20 });
        setTimeLeft(120);
        setGameState('PLAYING');
    }, []);

    const handleLevelComplete = async () => {
        setGameState('IDLE');
        setShowRewardOverlay(true);
        // Log progress is optional, but keep it for analytics
        try {
            await axios.post('/api/games/resistance-mode', {
                action: 'LOG_PROGRESS',
                walletAddress: publicKey?.toBase58(),
                level: level,
                score: score
            });
        } catch (e) { console.error("Failed to log progress", e); }

        setTimeout(() => {
            setLevel(prev => prev + 1);
            setMissionRewards(prev => ({
                laam: Math.floor(prev.laam * 1.1),
                tag: Math.floor(prev.tag * 1.1)
            }));
            setTimeLeft(prev => Math.max(30, 120 - (level * 10)));
            setGrid(Array.from({ length: COLS * ROWS }, () => Math.floor(Math.random() * 9) + 1));
            setShowRewardOverlay(false);
            setGameState('PLAYING');
        }, 3000);
    };

    useEffect(() => {
        if (gameState === 'PLAYING' && grid.length > 0 && grid.every(val => val === 0)) {
            handleLevelComplete();
        }
    }, [grid, gameState]);

    useEffect(() => {
        if (gameState === 'GAMEOVER' && score > 0 && publicKey) {
            axios.post('/api/games/resistance-mode', {
                action: 'SUBMIT_SCORE',
                walletAddress: publicKey.toBase58(),
                score: score,
                history: moveHistory,
                duration: Date.now() - gameStartTime
            }).then(() => fetchLeaderboard());
        }
    }, [gameState, score, publicKey, fetchLeaderboard, moveHistory, gameStartTime]);

    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => (prev <= 1 ? (setGameState('GAMEOVER'), 0) : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState]);

    const moveSelector = useCallback((dx: number, dy: number) => {
        setSelectorPos(prev => ({
            x: Math.max(0, Math.min(COLS - 1, prev.x + dx)),
            y: Math.max(0, Math.min(ROWS - 1, prev.y + dy))
        }));
    }, []);

    const stopMoving = useCallback(() => {
        if (moveInterval.current) clearInterval(moveInterval.current);
        if (moveDelay.current) clearTimeout(moveDelay.current);
        moveInterval.current = null;
        moveDelay.current = null;
    }, []);

    const startMoving = (dx: number, dy: number) => {
        stopMoving();
        moveSelector(dx, dy);
        moveDelay.current = setTimeout(() => {
            moveInterval.current = setInterval(() => moveSelector(dx, dy), 150);
        }, 200);
    };

    const handleAction = async () => {
        if (!publicKey || !isUnlocked) return;
        if (gameState !== 'PLAYING') {
            initGame();
            return;
        }

        if (!selectionStart) {
            setSelectionStart({ ...selectorPos });
        } else {
            const x1 = Math.min(selectionStart.x, selectorPos.x);
            const x2 = Math.max(selectionStart.x, selectorPos.x);
            const y1 = Math.min(selectionStart.y, selectorPos.y);
            const y2 = Math.max(selectionStart.y, selectorPos.y);

            let sum = 0;
            const targetIndices: number[] = [];
            for (let y = y1; y <= y2; y++) {
                for (let x = x1; x <= x2; x++) {
                    const idx = y * COLS + x;
                    if (grid[idx] > 0) {
                        sum += grid[idx];
                        targetIndices.push(idx);
                    }
                }
            }

            if (sum === 10) {
                const newGrid = [...grid];
                targetIndices.forEach(idx => newGrid[idx] = 0);
                setGrid(newGrid);
                setScore(prev => prev + targetIndices.length);
                setMoveHistory(prev => [...prev, {
                    coords: { x1, y1, x2, y2 },
                    timestamp: Date.now() - gameStartTime,
                    pointsEarned: targetIndices.length
                }]);
            }
            setSelectionStart(null);
        }
    };

    // Canvas Rendering
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const mobileBonus = (typeof window !== 'undefined' && window.innerWidth < 450) ? 1.2 : 1.0;
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, INTERNAL_RES, INTERNAL_RES);

        if (gameState === 'IDLE' && !showRewardOverlay) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#00ff41';
            ctx.font = `bold ${14 * SCALE}px 'Courier New', monospace`;
            ctx.fillText("RESISTANCE", INTERNAL_RES / 2, INTERNAL_RES / 2 - 40);
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${5 * SCALE}px 'Courier New', monospace`;
            ctx.fillText("ENCRYPTED DATA FRAGMENT #774", INTERNAL_RES / 2, INTERNAL_RES / 2 - 10);

            if (Math.floor(Date.now() / 500) % 2 === 0) {
                ctx.fillStyle = '#eab308';
                ctx.font = `bold ${7 * SCALE}px 'Courier New', monospace`;
                ctx.fillText("PRESS 'A' TO INITIALIZE", INTERNAL_RES / 2, INTERNAL_RES / 2 + 50);
            }
            ctx.strokeStyle = '#2d2d2d';
            ctx.lineWidth = 2 * SCALE;
            ctx.strokeRect(40, 40, INTERNAL_RES - 80, INTERNAL_RES - 80);
            return;
        }

        grid.forEach((val, i) => {
            if (val === 0) return;
            const x = (i % COLS) * CELL_SIZE;
            const y = Math.floor(i / COLS) * CELL_SIZE + HEADER_OFFSET;
            ctx.fillStyle = val % 2 === 0 ? '#ff004d' : '#00e436';
            ctx.font = `bold ${6 * SCALE * mobileBonus}px 'Courier New', monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(val.toString(), x + CELL_SIZE / 2, y + CELL_SIZE / 2);
        });

        if (selectionStart) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 * SCALE;
            ctx.setLineDash([4 * SCALE, 4 * SCALE]);
            const sx = Math.min(selectionStart.x, selectorPos.x) * CELL_SIZE;
            const sy = Math.min(selectionStart.y, selectorPos.y) * CELL_SIZE + HEADER_OFFSET;
            const sw = (Math.abs(selectorPos.x - selectionStart.x) + 1) * CELL_SIZE;
            const sh = (Math.abs(selectorPos.y - selectionStart.y) + 1) * CELL_SIZE;
            ctx.strokeRect(sx, sy, sw, sh);
            ctx.setLineDash([]);
        }

        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2 * SCALE;
        ctx.strokeRect(selectorPos.x * CELL_SIZE, selectorPos.y * CELL_SIZE + HEADER_OFFSET, CELL_SIZE, CELL_SIZE);

        ctx.fillStyle = '#eab308';
        ctx.font = `bold ${7 * SCALE * mobileBonus}px 'Courier New', monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE ${score}`, 10 * SCALE, 15 * SCALE);
        ctx.textAlign = 'right';
        ctx.fillText(`TIME ${timeLeft}s`, INTERNAL_RES - (10 * SCALE), 15 * SCALE);

        if (showRewardOverlay) {
            ctx.fillStyle = 'rgba(0,0,0,0.9)';
            ctx.fillRect(0, 0, INTERNAL_RES, INTERNAL_RES);
            ctx.fillStyle = '#eab308';
            ctx.textAlign = 'center';
            ctx.font = `bold ${12 * SCALE}px 'Courier New'`;
            ctx.fillText(`MISSION ${level} CLEAR!`, INTERNAL_RES / 2, INTERNAL_RES / 2 - 20);
            ctx.font = `bold ${8 * SCALE}px 'Courier New'`;
            ctx.fillText(`+${missionRewards.laam} LAAM | +${missionRewards.tag} TAG`, INTERNAL_RES / 2, INTERNAL_RES / 2 + 20);
        } else if (gameState === 'GAMEOVER') {
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(0, 0, INTERNAL_RES, INTERNAL_RES);
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = `bold ${10 * SCALE}px 'Courier New', monospace`;
            ctx.fillText("TIME UP!", INTERNAL_RES / 2, INTERNAL_RES / 2 - 20);
            ctx.font = `bold ${6 * SCALE}px 'Courier New', monospace`;
            ctx.fillText("PRESS A TO RESTART", INTERNAL_RES / 2, INTERNAL_RES / 2 + 20);
        }
    }, [grid, selectorPos, selectionStart, score, timeLeft, gameState, showRewardOverlay, level, missionRewards]);

    const handleUnlock = async () => {
        if (!publicKey || !wallet) return toast.error("Please connect wallet!");
        setIsActionLoading(true);
        const toastId = toast.loading("Processing Transaction...");
        try {
            const umi = createUmi(RPC_URL).use(walletAdapterIdentity(wallet.adapter as any)).use(mplToolbox());
            const SKR_MINT_UMI = umiPublicKey("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");
            const TREASURY_UMI = umiPublicKey("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc");
            const source = findAssociatedTokenPda(umi, { mint: SKR_MINT_UMI, owner: umiPublicKey(publicKey.toBase58()) })[0];
            const destination = findAssociatedTokenPda(umi, { mint: SKR_MINT_UMI, owner: TREASURY_UMI })[0];

            const result = await setComputeUnitPrice(umi, { microLamports: 50000 })
                .add(transferTokens(umi, { source, destination, authority: umi.identity, amount: BigInt(200 * 1_000_000) }))
                .sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });

            const signature = base58.deserialize(result.signature)[0];
            await axios.post('/api/games/resistance-mode', { action: 'UNLOCK_GAME', walletAddress: publicKey.toBase58(), signature });
            setIsUnlocked(true);
            toast.success("GAME UNLOCKED PERMANENTLY", { id: toastId });
        } catch (err: any) {
            toast.error("Unlock failed. Check SKR balance.", { id: toastId });
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            {gameState !== 'PLAYING' && (
                <div className={styles.infoPanel}>
                    <h2>HOW TO PLAY</h2>
                    <p>Use the <b>D-Pad</b> to move. Press <b>A</b> to start a selection, then <b>A</b> again on another number. If the numbers in your box sum to <b>10</b>, they clear!</p>
                    <div className={styles.rewardBadges}>
                        <span>🏆 Mission Completed = 1,000 LAAM & 20 TAG</span>
                        <span>⭐ Top 3 Daily = Daily Bonus</span>
                    </div>
                </div>
            )}

            <div className={styles.consoleShell}>
                <div className={styles.screenBezel}>
                    <canvas ref={canvasRef} width={INTERNAL_RES} height={INTERNAL_RES} className={styles.gameCanvas} />
                    {!connected ? (
                        <div className={styles.levelOverlay}><WalletMultiButtonDynamic /></div>
                    ) : !isUnlocked ? (
                        <div className={styles.levelOverlay}>
                            <div className={styles.unlockBox}>
                                <h3>ENCRYPTED</h3>
                                <p>ACCESS REQUIRES 200 $SKR</p>
                                <button className={styles.unlockBtn} onClick={handleUnlock} disabled={isActionLoading}>
                                    {isActionLoading ? "DECRYPTING..." : "INITIALIZE UNLOCK"}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className={styles.controls}>
                    <div className={styles.dPad}>
                        <button className={`${styles.dBtn} ${styles.up}`} onPointerDown={(e) => { e.preventDefault(); startMoving(0, -1); }} onPointerUp={stopMoving} onPointerLeave={stopMoving} />
                        <button className={`${styles.dBtn} ${styles.down}`} onPointerDown={(e) => { e.preventDefault(); startMoving(0, 1); }} onPointerUp={stopMoving} onPointerLeave={stopMoving} />
                        <button className={`${styles.dBtn} ${styles.left}`} onPointerDown={(e) => { e.preventDefault(); startMoving(-1, 0); }} onPointerUp={stopMoving} onPointerLeave={stopMoving} />
                        <button className={`${styles.dBtn} ${styles.right}`} onPointerDown={(e) => { e.preventDefault(); startMoving(1, 0); }} onPointerUp={stopMoving} onPointerLeave={stopMoving} />
                    </div>
                    <div className={styles.actionButtons}>
                        <button className={styles.circleBtn} onClick={(e) => { e.preventDefault(); handleAction(); }}>A</button>
                    </div>
                </div>
            </div>

            {gameState !== 'PLAYING' && (
                <div className={styles.leaderboardContainer}>
                    <div className={styles.boardHeader}>
                        <div className={styles.boardTitleSection}>
                            <h3>RANKINGS</h3>
                            <div className={styles.statsRow}>
                                <small>Reset in: {dailyResetTime}</small>
                                <small>Overall: Day {daysSinceStart} Completed</small>
                            </div>
                        </div>
                        <div className={styles.toggleGroup}>
                            <button className={leaderboardType === 'daily' ? styles.activeToggle : ''} onClick={() => setLeaderboardType('daily')}>DAILY</button>
                            <button className={leaderboardType === 'overall' ? styles.activeToggle : ''} onClick={() => setLeaderboardType('overall')}>OVERALL</button>
                        </div>
                    </div>
                    <div className={styles.boardList}>
                        {connected && (
                            <div className={styles.personalBestRow}>
                                <span className={styles.rank}>YOU</span>
                                <span className={styles.wallet}>YOUR {leaderboardType.toUpperCase()} BEST</span>
                                <span className={styles.points}>{userBestScore}</span>
                            </div>
                        )}
                        <div className={styles.divider} />
                        {leaderboard.map((user, index) => (
                            <div
                                key={index}
                                className={`${styles.boardItem} ${user.wallet === publicKey?.toBase58() ? styles.highlight : ''}`}
                            >
                                <span className={styles.rank}>#{index + 1}</span>
                                <span className={styles.wallet}>{user.wallet.slice(0, 4)}...{user.wallet.slice(-4)}</span>
                                <span className={styles.points}>{user.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}