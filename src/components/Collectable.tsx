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

export default function Collectable() {
    const { connection } = useConnection();
    const wallet = useWallet();

    // --- 1. CONFIG & HYDRATION ---
    const [isMounted, setIsMounted] = useState(false);

    // Move IDs inside so they are only accessed in the browser
    const CM_ID_STR = "CWikmfwwgHSYjXuXtBiXEE23M7sCpnGjBSjXxQuGizJm";
    const COLL_MINT_STR = "5LoQty88d9q9GhBcwVLYZPjaPNKMmBkK765PWah5msgJ";
    const SKR_MINT_STR = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
    const T_ATA_STR = "Csex5aLu6U6o1mqQrxWKqEmS6cLvitcxunQXMyZoDMEM";
    const T_WALLET_STR = "4sr6vgbWJ14dBH7SFEBwETapqPb3vrpstyuBmbc1vd4u";
    const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";

    // --- 2. STATES ---
    const [status, setStatus] = useState<'idle' | 'allow' | 'public'>('idle');
    const [isWarrior, setIsWarrior] = useState(false);
    const [totalMinted, setTotalMinted] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [countdown, setCountdown] = useState("");
    const [hasMintedWarriorThisBatch, setHasMintedWarriorThisBatch] = useState(false);
    const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

    const currentBatchLimit = Math.floor((optimisticCount ?? totalMinted) / 20) * 20 + 20;

    // Set mounted on first load
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // --- 3. DATA FETCHING ---
    useEffect(() => {
        const fetchData = async () => {
            if (!wallet.publicKey || !CM_ID_STR) return;

            try {
                const CM_PUBKEY = publicKey(CM_ID_STR);
                const umi = createUmi(RPC_ENDPOINT).use(mplCandyMachine());
                const candyMachine = await fetchCandyMachine(umi, CM_PUBKEY);
                const redeemed = Number(candyMachine.itemsRedeemed);

                setTotalMinted(redeemed);
                setIsLocked(redeemed > 0 && redeemed % 20 === 0);

                const currentBatchNumber = Math.floor(redeemed / 20);

                const res = await fetch(`/api/collectable/check-status?walletAddress=${wallet.publicKey.toBase58()}`);

                if (!res.ok) {
                    console.error("API Error - Status:", res.status);
                    return;
                }

                const data = await res.json();
                setIsWarrior(data.isWarrior);
                setHasMintedWarriorThisBatch(data.lastWarriorMintBatch === currentBatchNumber);

            } catch (e) {
                console.error("SYNC_ERROR", e);
            }
        };

        if (isMounted) {
            fetchData();
            const interval = setInterval(fetchData, 10000);
            return () => clearInterval(interval);
        }
    }, [wallet.publicKey, connection, CM_ID_STR, isMounted]);

    // --- 4. LOCK TIMER ---
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

    // --- 5. SECURE MINT FUNCTION ---
    const handleMint = async (mode: 'allow' | 'public') => {
        if (!isMounted || !wallet.publicKey) return;

        if (isLocked) {
            toast.error("BATCH_LOCKED: Wait for the next window.");
            return;
        }

        setStatus(mode);

        const umi = createUmi(RPC_ENDPOINT)
            .use(walletAdapterIdentity(wallet))
            .use(mplToolbox())
            .use(mplCandyMachine()) as any;

        try {
            const CM_PUBKEY = publicKey(CM_ID_STR);
            const SKR_PUBKEY = publicKey(SKR_MINT_STR);
            const T_ATA = publicKey(T_ATA_STR);
            const T_WALLET = publicKey(T_WALLET_STR); // 4sr6vgb...

            const candyMachine = await fetchCandyMachine(umi, CM_PUBKEY);
            const nftMint = generateSigner(umi);

            // 1. Build the mint instruction
            let builder = transactionBuilder()
                .add(setComputeUnitLimit(umi, { units: 800_000 }))
                .add(setComputeUnitPrice(umi, { microLamports: 80_000 }))
                .add(mintV2(umi, {
                    candyMachine: CM_PUBKEY,
                    candyGuard: candyMachine.mintAuthority, // This is GmQdFbm...
                    collectionMint: publicKey(COLL_MINT_STR), // This is 5LoQty...
                    collectionUpdateAuthority: candyMachine.authority, // This is 4sr6...
                    nftMint,
                    group: some(mode),
                    mintArgs: {
                        tokenPayment: some({
                            mint: SKR_PUBKEY,
                            destinationAta: T_ATA
                        }),
                    },
                }));

            // 2. CRITICAL: Inject the Treasury Wallet as a writable account
            // The Token Payment guard needs the destination wallet owner to be present in the transaction
            builder = builder.mapInstructions((wrapped) => {
                if (wrapped.instruction.programId.toString() === "CMYK9869v7YzzZcnvW8at6u2pAbSiv7atvUeKAs9X6j") {
                    return {
                        ...wrapped,
                        instruction: {
                            ...wrapped.instruction,
                            keys: [
                                ...wrapped.instruction.keys,
                                { pubkey: T_WALLET, isSigner: false, isWritable: true }
                            ],
                        },
                    };
                }
                return wrapped;
            });

            // 3. Send and Confirm
            const { signature } = await builder.sendAndConfirm(umi);

            // ... (rest of your verification logic remains the same)

        } catch (err: any) {
            console.error("MINT_LOGS:", err);
            toast.error("MINT FAILED: Check logs or $SKR balance.");
        } finally {
            setStatus('idle');
        }
    };

    // Prevent SSR errors by returning null until mounted
    if (!isMounted) return null;

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