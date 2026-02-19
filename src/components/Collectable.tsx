import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import {
    mplCandyMachine,
    fetchCandyMachine,
    mintV2,
    fetchCandyGuard,
} from '@metaplex-foundation/mpl-candy-machine';
import { generateSigner, transactionBuilder, publicKey, some } from '@metaplex-foundation/umi';
import {
    setComputeUnitLimit,
    setComputeUnitPrice,
    mplToolbox
} from '@metaplex-foundation/mpl-toolbox';
import { toast } from 'react-hot-toast';
import styles from '../styles/Collectable.module.css';

// --- CONSTANTS ---
const CANDY_MACHINE_ID = publicKey(process.env.NEXT_PUBLIC_WARRIOR_CANDY_MACHINE_ID!);
const COLLECTION_MINT = publicKey(process.env.NEXT_PUBLIC_WARRIOR_COLLECTION_MINT!);
const SKR_MINT = publicKey(process.env.NEXT_PUBLIC_SKR_TOKEN_MINT!);
const TREASURY_WALLET = publicKey(process.env.NEXT_PUBLIC_WARRIOR_TREASURY_WALLET!);
const TREASURY_ATA = publicKey(process.env.NEXT_PUBLIC_WARRIOR_TREASURY_ATA!);

export default function Collectable() {
    const { connection } = useConnection();
    const wallet = useWallet();

    const [status, setStatus] = useState<'idle' | 'allow' | 'public'>('idle');
    const [isWarrior, setIsWarrior] = useState(false);
    const [totalMinted, setTotalMinted] = useState(0);
    const [isLocked, setIsLocked] = useState(false); // Global Batch Lock
    const [countdown, setCountdown] = useState("");
    const [hasMintedWarriorThisBatch, setHasMintedWarriorThisBatch] = useState(false);
    const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

    const currentBatchLimit = Math.floor((optimisticCount ?? totalMinted) / 20) * 20 + 20;

    // 1. DATA FETCHING & BATCH LOGIC
    useEffect(() => {
        const fetchData = async () => {
            if (!wallet.publicKey) return;
            try {
                // Fetch Candy Machine state first to get current total
                const umi = createUmi(connection.rpcEndpoint).use(mplCandyMachine());
                const candyMachine = await fetchCandyMachine(umi, CANDY_MACHINE_ID);
                const redeemed = Number(candyMachine.itemsRedeemed);

                setTotalMinted(redeemed);
                setIsLocked(redeemed > 0 && redeemed % 20 === 0);

                const currentBatchNumber = Math.floor(redeemed / 20);

                // Fetch user status from Prisma
                const res = await fetch(`/api/collectable/check-status?walletAddress=${wallet.publicKey.toBase58()}`);
                const data = await res.json();

                setIsWarrior(data.isWarrior);
                // Check if the user's last stored batch matches the current CM batch
                setHasMintedWarriorThisBatch(data.lastWarriorMintBatch === currentBatchNumber);

            } catch (e) {
                console.error("SYNC_ERROR", e);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [wallet.publicKey, connection]);

    // 2. GLOBAL BATCH LOCK TIMER (23:59:59)
    useEffect(() => {
        if (!isLocked) return;
        const timer = setInterval(() => {
            const now = new Date();
            const end = new Date();
            end.setHours(23, 59, 59);
            const diff = end.getTime() - now.getTime();
            if (diff <= 0) { setIsLocked(false); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setCountdown(`${h}H ${m}M ${s}S`);
        }, 1000);
        return () => clearInterval(timer);
    }, [isLocked]);

    // 3. SECURE MINT FUNCTION
    const handleMint = async (mode: 'allow' | 'public') => {
        if (isLocked || !wallet.publicKey) return;
        if (mode === 'allow' && hasMintedWarriorThisBatch) {
            toast.error(`Warrior Access limited to 1 per batch.`);
            return;
        }

        setStatus(mode);
        // 3. SECURE MINT FUNCTION
        const umi = createUmi(connection.rpcEndpoint)
            .use(walletAdapterIdentity(wallet))
            .use(mplCandyMachine())
            .use(mplToolbox()) as any;

        try {
            const candyMachine = await fetchCandyMachine(umi, CANDY_MACHINE_ID);
            const guard = await fetchCandyGuard(umi, candyMachine.mintAuthority);
            const nftMint = generateSigner(umi);

            // Build Transaction
            const builder = transactionBuilder()
                .add(setComputeUnitLimit(umi, { units: 800_000 }))
                .add(setComputeUnitPrice(umi, { microLamports: 60_000 }))
                .add(mintV2(umi, {
                    candyMachine: CANDY_MACHINE_ID,
                    candyGuard: guard.publicKey,
                    nftMint,
                    group: some(mode),
                    collectionMint: COLLECTION_MINT,
                    collectionUpdateAuthority: candyMachine.authority,
                    mintArgs: {
                        tokenPayment: some({ mint: SKR_MINT, destinationAta: TREASURY_ATA }),
                    },
                }));

            // Map instructions for 0x1779 fix
            const finalBuilder = builder.mapInstructions((wrapped) => {
                if (wrapped.instruction.programId.toString() === guard.publicKey.toString()) {
                    return {
                        ...wrapped,
                        instruction: {
                            ...wrapped.instruction,
                            keys: [...wrapped.instruction.keys, { pubkey: TREASURY_WALLET, isSigner: false, isWritable: true }],
                        },
                    };
                }
                return wrapped;
            });

            // 4. EXECUTE ON CHAIN
            const { signature } = await finalBuilder.sendAndConfirm(umi);

            // 5. BACKEND VERIFICATION (Anti-Cheat)
            const verifyRes = await fetch('/api/collectable/verify-mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signature: Buffer.from(signature).toString('base64'),
                    walletAddress: wallet.publicKey.toBase58(),
                    mode
                })
            });

            if (verifyRes.ok) {
                toast.success("MINT VERIFIED & SAVED!");
                setOptimisticCount((totalMinted || 0) + 1);
                if (mode === 'allow') setHasMintedWarriorThisBatch(true);
            } else {
                toast.error("Chain success, DB sync failed.");
            }

        } catch (err: any) {
            console.error("MINT_LOGS:", err);
            toast.error("MINT FAILED: Check balance or network.");
        } finally {
            setStatus('idle');
        }
    };

    return (
        <div className={`${styles.container} ${isLocked ? styles.systemLocked : ''}`}>
            <div className={styles.headerRow}>
                <div className={styles.counterBox}>
                    <span className={styles.label}>EXTRACTED:</span>
                    <span className={styles.value}>{(optimisticCount ?? totalMinted)} / {currentBatchLimit}</span>
                </div>
                {isLocked && (
                    <div className={styles.timerBox}>
                        <span className={styles.label}>NEXT_BATCH_IN:</span>
                        <span className={styles.value}>{countdown}</span>
                    </div>
                )}
            </div>

            <div className={styles.mintGrid}>
                {/* WARRIOR ACCESS (300 SKR - 1 PER BATCH) */}
                <div className={`${styles.mintCard} ${(!isWarrior || isLocked || hasMintedWarriorThisBatch) ? styles.locked : ''}`}>
                    <div className={styles.cardTitle}>WARRIOR_ACCESS</div>
                    <div className={styles.price}>300 $SKR</div>
                    <button
                        onClick={() => handleMint('allow')}
                        disabled={!isWarrior || status !== 'idle' || isLocked || hasMintedWarriorThisBatch}
                        className={styles.claimButton}
                    >
                        {isLocked ? 'LOCKED' :
                            hasMintedWarriorThisBatch ? 'BATCH LIMIT' :
                                (status === 'allow' ? 'SYNCING...' : 'INITIATE')}
                    </button>
                    <div className={styles.limitNote}>1 MINT / BATCH</div>
                </div>

                {/* PUBLIC ACCESS (1000 SKR - NO LIMIT) */}
                <div className={`${styles.mintCard} ${isLocked ? styles.locked : ''}`}>
                    <div className={styles.cardTitle}>PUBLIC_ACCESS</div>
                    <div className={styles.price}>1000 $SKR</div>
                    <button
                        onClick={() => handleMint('public')}
                        disabled={status !== 'idle' || isLocked}
                        className={styles.claimButton}
                    >
                        {isLocked ? 'LOCKED' : (status === 'public' ? 'SYNCING...' : 'INITIATE')}
                    </button>
                    <div className={styles.limitNote}>UNLIMITED ACCESS</div>
                </div>
            </div>
            <div className={styles.matrixBg}></div>
        </div>
    );
}