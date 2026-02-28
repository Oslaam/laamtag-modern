import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { mplToolbox, transferTokens, findAssociatedTokenPda, setComputeUnitPrice } from "@metaplex-foundation/mpl-toolbox";

import { toast } from 'react-hot-toast';
import styles from '../styles/PlinkoGame.module.css';

// Using constants matching your API config
const SKR_MINT_STR = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
const TREASURY_STR = "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc";
const UNLOCK_FEE = 300;
const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";

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
    const { publicKey, wallet } = useWallet();
    const boardRef = useRef<HTMLDivElement>(null);

    const [isUnlocked, setIsUnlocked] = useState(false);
    const [lines, setLines] = useState(8);
    const [isAnimating, setIsAnimating] = useState(false);
    const [ballPath, setBallPath] = useState<number[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [betAmount, setBetAmount] = useState<number>(200);
    const [activeRow, setActiveRow] = useState<number | null>(null);

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
        if (!publicKey || !wallet) return toast.error("Connect Wallet First");

        setLoading(true);
        const toastId = toast.loading("Initializing Unlock...");

        try {
            const umi = createUmi(RPC_URL)
                .use(walletAdapterIdentity(wallet.adapter as any))
                .use(mplToolbox());

            const SKR_MINT_UMI = umiPublicKey(SKR_MINT_STR);
            const TREASURY_UMI = umiPublicKey(TREASURY_STR);

            const source = findAssociatedTokenPda(umi, {
                mint: SKR_MINT_UMI,
                owner: umiPublicKey(publicKey.toBase58())
            })[0];

            const destination = findAssociatedTokenPda(umi, {
                mint: SKR_MINT_UMI,
                owner: TREASURY_UMI
            })[0];

            const result = await setComputeUnitPrice(umi, { microLamports: 50000 })
                .add(transferTokens(umi, {
                    source,
                    destination,
                    authority: umi.identity,
                    amount: BigInt(UNLOCK_FEE * 1_000_000)
                }))
                .sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });

            const signature = base58.deserialize(result.signature)[0];

            const res = await fetch('/api/games/plinko/play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'UNLOCK_GAME',
                    walletAddress: publicKey.toBase58(),
                    signature
                })
            });

            const data = await res.json();
            if (data.success) {
                setIsUnlocked(true);
                toast.success("Plinko Unlocked!", { id: toastId });
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            toast.error(err.message || "Unlock failed", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const handlePlay = useCallback(async () => {
        if (!publicKey || !wallet || isAnimating) return;
        if (betAmount < 200) return toast.error("Minimum bet is 200 $SKR");

        const toastId = toast.loading("Processing Bet...");

        try {
            const umi = createUmi(RPC_URL)
                .use(walletAdapterIdentity(wallet.adapter as any))
                .use(mplToolbox());

            const SKR_MINT_UMI = umiPublicKey(SKR_MINT_STR);
            const TREASURY_UMI = umiPublicKey(TREASURY_STR);

            const source = findAssociatedTokenPda(umi, {
                mint: SKR_MINT_UMI,
                owner: umiPublicKey(publicKey.toBase58())
            })[0];

            const destination = findAssociatedTokenPda(umi, {
                mint: SKR_MINT_UMI,
                owner: TREASURY_UMI
            })[0];

            // Send Bet via Umi (Priority fee added for mobile stability)
            const result = await setComputeUnitPrice(umi, { microLamports: 50000 })
                .add(transferTokens(umi, {
                    source,
                    destination,
                    authority: umi.identity,
                    amount: BigInt(betAmount * 1_000_000)
                }))
                .sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });

            const signature = base58.deserialize(result.signature)[0];

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

            toast.dismiss(toastId);
            setBallPath(data.path);
            setIsAnimating(true);

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
            console.error(error);
            toast.error(error.message || "Transaction failed", { id: toastId });
        }
    }, [isAnimating, lines, publicKey, wallet, betAmount]);

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

    const getBallKeyframes = () => {
        if (!ballPath || !boardRef.current) return { x: [0], y: [0] };

        const boardWidth = boardRef.current.offsetWidth;
        const isMobile = window.innerWidth < 480;
        const rowHeight = isMobile ? 22 : 30;
        const horizontalStep = (boardWidth * 0.04); // Adjust this multiplier to match your peg spacing (%)

        let currentX = 0;
        const xKeyframes = [0];
        const yKeyframes = [0];

        ballPath.forEach((step, index) => {
            // 0 = left, 1 = right
            currentX += (step === 1 ? horizontalStep : -horizontalStep);
            xKeyframes.push(currentX);
            yKeyframes.push((index + 1) * rowHeight);
        });

        // Final drop into multiplier box
        yKeyframes.push(yKeyframes[yKeyframes.length - 1] + 25);
        xKeyframes.push(currentX);

        return { x: xKeyframes, y: yKeyframes };
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
                                <div
                                    key={pegIndex}
                                    className={`${styles.peg} ${activeRow === rowIndex ? styles.pegHit : ''}`}
                                />
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
                        {isAnimating && ballPath && (() => {
                            const keyframes = getBallKeyframes();
                            return (
                                <motion.div
                                    {...({
                                        className: styles.ball,
                                        initial: { y: 0, x: 0 },
                                        animate: {
                                            y: keyframes.y,
                                            x: keyframes.x
                                        },
                                        transition: {
                                            duration: 4.0,
                                            ease: "linear",
                                            times: Array.from({ length: keyframes.y.length }, (_, i) => i / (keyframes.y.length - 1))
                                        },
                                        // ADD THIS: Detects progress and highlights the row
                                        onUpdate: (latest: any) => {
                                            const isMobile = window.innerWidth < 480;
                                            const rowHeight = isMobile ? 22 : 30;
                                            const currentRow = Math.floor(latest.y / rowHeight);
                                            if (currentRow >= 0 && currentRow < lines) {
                                                setActiveRow(currentRow);
                                            }
                                        },
                                        onAnimationComplete: () => setActiveRow(null),
                                        style: { left: "50%", position: "absolute", marginLeft: "-6px" }
                                    } as any)}
                                />
                            );
                        })()}
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