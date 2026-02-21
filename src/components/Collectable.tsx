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
import { base58 } from '@metaplex-foundation/umi/serializers';
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
            // Guard: Stop if no wallet or if we aren't mounted yet
            if (!wallet.publicKey || !isMounted) return;

            try {
                const CM_PUBKEY = publicKey(CM_ID_STR);

                // USE HARDCODED RPC TO MATCH MINT.TSX
                const umi = createUmi("https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3")
                    .use(mplCandyMachine());

                const candyMachine = await fetchCandyMachine(umi, CM_PUBKEY);
                const redeemed = Number(candyMachine.itemsRedeemed);

                setTotalMinted(redeemed);
                setIsLocked(redeemed > 0 && redeemed % 20 === 0);

                const currentBatchNumber = Math.floor(redeemed / 20);

                // Fetching your custom API
                const res = await fetch(`/api/collectable/check-status?walletAddress=${wallet.publicKey.toBase58()}`);

                if (res.ok) {
                    const data = await res.json();
                    setIsWarrior(data.isWarrior);
                    setHasMintedWarriorThisBatch(data.lastWarriorMintBatch === currentBatchNumber);
                }

            } catch (e) {
                // Log less aggressively to keep console clean
                console.warn("Collectable Syncing...");
            }
        };

        if (isMounted && wallet.publicKey) {
            fetchData();
            // CHANGE TO 30 SECONDS (30000)
            const interval = setInterval(fetchData, 30000);
            return () => clearInterval(interval);
        }
    }, [wallet.publicKey, isMounted]); // Removed connection.rpcEndpoint from deps to prevent clashing

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
        if (!isMounted || !wallet.publicKey || !wallet.connected) return;

        // 1. RULE CHECK (Handled by your Database/API logic)
        if (isLocked) {
            toast.error("BATCH_LOCKED: Wait for the next window.");
            return;
        }
        if (mode === 'allow' && hasMintedWarriorThisBatch) {
            toast.error("WARRIOR_LIMIT: 1 per batch allowed.");
            return;
        }

        setStatus(mode);
        const loadId = toast.loading("Preparing Mint...");

        try {
            const umi = createUmi(RPC_ENDPOINT)
                .use(walletAdapterIdentity(wallet))
                .use(mplToolbox())
                .use(mplCandyMachine());

            const CM_PUBKEY = publicKey(CM_ID_STR);
            const candyMachine = await fetchCandyMachine(umi, CM_PUBKEY);
            const nftMint = generateSigner(umi);

            // 2. BUILD THE TRANSACTION
            let builder = transactionBuilder()
                .add(setComputeUnitLimit(umi, { units: 800_000 }))
                .add(setComputeUnitPrice(umi, { microLamports: 150_000 }))
                .add(mintV2(umi, {
                    candyMachine: CM_PUBKEY,
                    candyGuard: candyMachine.mintAuthority,
                    collectionMint: publicKey(COLL_MINT_STR),
                    collectionUpdateAuthority: candyMachine.authority,
                    nftMint,
                    group: some(mode),
                    mintArgs: {
                        tokenPayment: some({
                            mint: publicKey(SKR_MINT_STR),
                            destinationAta: publicKey(T_ATA_STR)
                        }),
                        // WE REMOVED mintLimit here because it's not in your config.json
                    },
                }));

            // 3. FIX ACCOUNT INJECTION (The "Instruction 4" fix)
            builder = builder.mapInstructions((wrapped) => {
                // This ID is the standard Candy Machine program ID
                if (wrapped.instruction.programId.toString() === "CndyV3L7kwLE9Vq89U9B9KdeE77VBaK5DEn3Yf2KNoR") {
                    return {
                        ...wrapped,
                        instruction: {
                            ...wrapped.instruction,
                            keys: [
                                ...wrapped.instruction.keys,
                                { pubkey: publicKey(T_WALLET_STR), isSigner: false, isWritable: true }
                            ],
                        },
                    };
                }
                return wrapped;
            });

            // 4. SIGN AND SEND
            const { signature } = await builder.sendAndConfirm(umi, {
                send: {
                    skipPreflight: true,
                    maxRetries: 3,
                },
                confirm: {
                    commitment: 'confirmed',
                }
            });

            // 5. UPDATE DATABASE (This locks the user for the batch)
            await fetch('/api/collectable/verify-mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Convert the Umi signature to a Base58 string properly
                    signature: typeof signature === 'string' ? signature : base58.deserialize(signature)[0],
                    walletAddress: wallet.publicKey.toBase58(),
                    mode: mode
                })
            });
            toast.success("MINT SUCCESSFUL!", { id: loadId });
            setTimeout(() => window.location.reload(), 2000);

        } catch (err: any) {
            console.error("MINT_ERROR:", err);
            toast.error("Transaction Failed. Check your $SKR balance.", { id: loadId });
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