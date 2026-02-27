import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createTransferCheckedInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { toast } from 'react-hot-toast';
import styles from '../styles/PlinkoGame.module.css';

const SKR_MINT = new PublicKey("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");
const TREASURY = new PublicKey("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc");
const UNLOCK_FEE = 300;

const MULTIPLIERS: Record<number, number[]> = {
    8: [5.6, 2.1, 1.1, 0.5, 0, 0.5, 1.1, 2.1, 5.6],
    9: [5.6, 2, 1.6, 0.7, 0, 0, 0.7, 1.6, 2, 5.6],
    10: [8.9, 3, 1.4, 1.1, 0.5, 0, 0.5, 1.1, 1.4, 3, 8.9],
    11: [8.4, 3, 1.9, 1.3, 0.7, 0, 0, 0.7, 1.3, 1.9, 3, 8.4],
    12: [10, 3, 1.6, 1.4, 1.1, 0.5, 0, 0.5, 1.1, 1.4, 1.6, 3, 10],
    13: [8.1, 4, 3, 1.9, 1.2, 0.9, 0, 0, 0.9, 1.2, 1.9, 3, 4, 8.1],
    14: [7.1, 4, 1.9, 1.4, 1.3, 1.1, 0.5, 0, 0.5, 1.1, 1.3, 1.4, 1.9, 4, 7.1],
    15: [15, 8, 3, 2, 1.5, 1.1, 0.7, 0, 0, 0.7, 1.1, 1.5, 2, 3, 8, 15],
    16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 0.5, 0, 0.5, 1.1, 1.2, 1.4, 1.4, 2, 9, 16]
};

const PlinkoGame = () => {
    const { publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const boardRef = useRef<HTMLDivElement>(null);

    const [isUnlocked, setIsUnlocked] = useState(false);
    const [lines, setLines] = useState(8);
    const [isAnimating, setIsAnimating] = useState(false);
    const [ballPath, setBallPath] = useState<number[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [betAmount, setBetAmount] = useState<number>(200);

    useEffect(() => {
        if (!publicKey) {
            setLoading(false);
            return;
        }
        fetch(`/api/user/${publicKey.toBase58()}`)
            .then(res => res.json())
            .then(data => {
                setIsUnlocked(data.hasPlinkoUnlocked);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [publicKey]);

    const handleUnlock = async () => {
        if (!publicKey) return toast.error("Connect Wallet First");
        try {
            setLoading(true);
            const userAta = await getAssociatedTokenAddress(SKR_MINT, publicKey);
            const treasuryAta = await getAssociatedTokenAddress(SKR_MINT, TREASURY);

            const tx = new Transaction().add(
                createTransferCheckedInstruction(
                    userAta, SKR_MINT, treasuryAta, publicKey,
                    UNLOCK_FEE * 1_000_000, 6
                )
            );

            const signature = await sendTransaction(tx, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            const res = await fetch('/api/games/plinko/play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'UNLOCK_GAME', walletAddress: publicKey.toBase58(), signature })
            });

            const data = await res.json();
            if (data.success) {
                setIsUnlocked(true);
                toast.success("Plinko Unlocked!");
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            toast.error(err.message || "Unlock failed");
        } finally {
            setLoading(false);
        }
    };

    const handlePlay = useCallback(async () => {
        if (!publicKey || isAnimating) return;
        if (betAmount < 200) return toast.error("Minimum bet is 200 $SKR");

        try {
            const userAta = await getAssociatedTokenAddress(SKR_MINT, publicKey);
            const treasuryAta = await getAssociatedTokenAddress(SKR_MINT, TREASURY);

            const tx = new Transaction().add(
                createTransferCheckedInstruction(
                    userAta, SKR_MINT, treasuryAta, publicKey,
                    betAmount * 1_000_000, 6
                )
            );

            const signature = await sendTransaction(tx, connection);
            const loadingToast = toast.loading("Processing Bet...");
            await connection.confirmTransaction(signature, 'confirmed');
            toast.dismiss(loadingToast);

            const response = await fetch('/api/games/plinko/play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'PLAY',
                    walletAddress: publicKey.toBase58(),
                    lines,
                    betAmount,
                    signature
                }),
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            setBallPath(data.path);
            setIsAnimating(true);

            // UPDATED: Sync with 4.0s animation duration + buffer
            setTimeout(() => {
                setIsAnimating(false);
                setBallPath(null);
                if (data.winAmount > 0) {
                    toast.success(`WIN! ${data.winAmount} $SKR added to Loot Vault`, { duration: 5000 });
                } else {
                    toast.error("Better luck next time!");
                }
            }, 4200);
        } catch (error: any) {
            toast.error(error.message || "Transaction failed");
        }
    }, [isAnimating, lines, publicKey, betAmount, connection, sendTransaction]);

    if (loading) return <div className="text-white font-bold text-center p-10 uppercase tracking-widest">Initialising Engine...</div>;

    const currentMultipliers = MULTIPLIERS[lines] || MULTIPLIERS[8];

    const getBallXOffset = () => {
        if (!ballPath || !boardRef.current) return 0;
        const boardWidth = boardRef.current.offsetWidth;
        const totalSteps = ballPath.reduce((acc, val) => acc + (val === 1 ? 1 : -1), 0);
        const stepSize = boardWidth / (lines + 2);
        return totalSteps * (stepSize / 1.5);
    };

    const getBallYTarget = () => {
        if (!boardRef.current) return lines * 30;
        const rowHeight = window.innerWidth < 480 ? 22 : 30;
        return lines * rowHeight;
    };

    return (
        <div className={styles.container}>
            {!isUnlocked ? (
                <div className="flex flex-col items-center justify-center p-10 text-center">
                    <h2 className="text-white text-2xl font-black mb-4 uppercase">Blanko Drop Locked</h2>
                    <p className="text-slate-400 mb-8 max-w-xs text-xs font-bold">Unlock your Blanko Drop with 300 $SKR to initialize the engine.</p>
                    <button onClick={handleUnlock} className="bg-yellow-400 text-black px-10 py-4 rounded-xl font-black text-lg hover:bg-yellow-300 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                        UNLOCK FOR 300 $SKR
                    </button>
                </div>
            ) : (
                <div className={styles.board} ref={boardRef}>
                    {[...Array(lines)].map((_, rowIndex) => (
                        <div key={rowIndex} className={styles.pegRow}>
                            {[...Array(rowIndex + 3)].map((_, pegIndex) => (
                                <div key={pegIndex} className={styles.peg} />
                            ))}
                        </div>
                    ))}

                    <div className={styles.multiplierRow}>
                        {currentMultipliers.map((m, i) => (
                            <div key={i} className={styles.multiplierBox} style={{
                                backgroundColor:
                                    m === 0 ? '#111827' :
                                        m <= 0.5 ? '#7f1d1d' :
                                            m <= 1 ? '#ef4444' :
                                                m <= 2 ? '#eab308' :
                                                    m <= 5 ? '#16a34a' :
                                                        '#3b82f6',
                                color: m === 0 ? '#6b7280' : '#fff',
                                border: m === 0 ? '1px solid #374151' : 'none',
                            }}>
                                {m === 0 ? '0x' : `${m}x`}
                            </div>
                        ))}
                    </div>

                    <AnimatePresence>
                        {isAnimating && ballPath && (
                            <motion.div
                                {...({
                                    className: styles.ball,
                                    initial: { y: 0, x: 0 },
                                    animate: {
                                        y: getBallYTarget(),
                                        x: getBallXOffset()
                                    },
                                    // UPDATED: Slower transition
                                    transition: { duration: 4.0, ease: "circIn" },
                                    style: { left: "50%", position: "absolute", marginLeft: "-6px" }
                                } as any)}
                            />
                        )}
                    </AnimatePresence>

                    <div className={styles.controls}>
                        <div className={styles.controlGrid}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Rows</label>
                                <div className={styles.selectWrapper}>
                                    <select
                                        value={lines}
                                        onChange={(e) => setLines(Number(e.target.value))}
                                        className={styles.selectInput}
                                    >
                                        {[8, 9, 10, 11, 12, 13, 14, 15, 16].map(l => (
                                            <option key={l} value={l}>{l} Rows</option>
                                        ))}
                                    </select>
                                    <span className={styles.selectArrow}>▼</span>
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Bet Amount</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="number"
                                        value={betAmount}
                                        onChange={(e) => setBetAmount(Math.max(200, Number(e.target.value)))}
                                        className={styles.numberInput}
                                    />
                                    <span className={styles.currencyBadge}>$SKR</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.actionArea}>
                            <button
                                onClick={handlePlay}
                                disabled={isAnimating}
                                className={`${styles.playButton} ${isAnimating ? styles.animating : ''}`}
                            >
                                <span className={styles.buttonText}>
                                    {isAnimating ? "Ball in Motion..." : "Drop Ball"}
                                </span>
                                {!isAnimating && <span className={styles.buttonGlow} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlinkoGame;