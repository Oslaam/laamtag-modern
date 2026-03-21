import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import {
    mplCandyMachine,
    fetchCandyMachine,
    mintV2,
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

    const [isMounted, setIsMounted] = useState(false);

    const CM_ID_STR = "CWikmfwwgHSYjXuXtBiXEE23M7sCpnGjBSjXxQuGizJm";
    const COLL_MINT_STR = "5LoQty88d9q9GhBcwVLYZPjaPNKMmBkK765PWah5msgJ";
    const SKR_MINT_STR = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
    const T_ATA_STR = "Csex5aLu6U6o1mqQrxWKqEmS6cLvitcxunQXMyZoDMEM";
    const T_WALLET_STR = "4sr6vgbWJ14dBH7SFEBwETapqPb3vrpstyuBmbc1vd4u";
    const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";

    const [status, setStatus] = useState<'idle' | 'allow' | 'public'>('idle');
    const [isWarrior, setIsWarrior] = useState(false);
    const [totalMinted, setTotalMinted] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [countdown, setCountdown] = useState("");
    const [hasMintedWarriorThisBatch, setHasMintedWarriorThisBatch] = useState(false);
    const [optimisticCount, setOptimisticCount] = useState<number | null>(null);
    const [isShaking, setIsShaking] = useState(false);

    const currentBatchLimit = Math.floor((optimisticCount ?? totalMinted) / 20) * 20 + 20;

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!wallet.publicKey || !isMounted) return;

            try {
                const CM_PUBKEY = publicKey(CM_ID_STR);
                const umi = createUmi(RPC_ENDPOINT).use(mplCandyMachine());

                const candyMachine = await fetchCandyMachine(umi, CM_PUBKEY);
                const redeemed = Number(candyMachine.itemsRedeemed);

                setTotalMinted(redeemed);
                setIsLocked(redeemed > 0 && redeemed % 20 === 0);

                const currentBatchNumber = Math.floor(redeemed / 20);

                const res = await fetch(`/api/collectable/check-status?walletAddress=${wallet.publicKey.toBase58()}`);

                if (res.ok) {
                    const data = await res.json();
                    setIsWarrior(data.isWarrior);
                    setHasMintedWarriorThisBatch(data.lastWarriorMintBatch === currentBatchNumber);
                }

            } catch (e) {
                console.warn("Collectable Syncing...");
            }
        };

        if (isMounted && wallet.publicKey) {
            fetchData();
            const interval = setInterval(fetchData, 30000);
            return () => clearInterval(interval);
        }
    }, [wallet.publicKey, isMounted]);

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

    const handleMint = async (mode: 'allow' | 'public') => {
        if (!isMounted || !wallet.publicKey || !wallet.connected) return;

        if (isLocked) {
            toast.error("BATCH_LOCKED: Wait for the next window.");
            return;
        }
        if (mode === 'allow' && hasMintedWarriorThisBatch) {
            toast.error("WARRIOR_LIMIT: 1 per batch allowed.");
            return;
        }

        // SOL balance check
        const balance = await connection.getBalance(wallet.publicKey);
        const minSOL = 20000000; // 0.02 SOL

        if (balance < minSOL) {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            toast.error("GAS_ALERT: 0.02 SOL REQUIRED", {
                style: {
                    border: '1px solid #ff4444',
                    padding: '16px',
                    color: '#ff4444',
                    background: '#000',
                    boxShadow: '0 0 20px rgba(255, 68, 68, 0.3)',
                    textTransform: 'uppercase',
                    fontSize: '12px',
                    fontWeight: 'bold',
                },
            });
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
                    },
                }));

                
            const { signature } = await builder.sendAndConfirm(umi, {
                send: {
                    maxRetries: 3,
                },
                confirm: {
                    commitment: 'confirmed',
                }
            });

            const sigString = typeof signature === 'string'
                ? signature
                : base58.deserialize(signature)[0];

            // Only call verify-mint after confirmed on-chain success
            const verifyRes = await fetch('/api/collectable/verify-mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signature: sigString,
                    walletAddress: wallet.publicKey.toBase58(),
                    mode: mode
                })
            });

            if (!verifyRes.ok) {
                const errData = await verifyRes.json();
                throw new Error(errData.error || "Database sync failed");
            }

            toast.success("MINT SUCCESSFUL!", { id: loadId });
            setTimeout(() => window.location.reload(), 2000);

        } catch (err: any) {
            console.error("MINT_ERROR:", err);
            // Surface the actual error message — preflight errors are descriptive
            const msg = err?.message?.includes('custom program error')
                ? "Insufficient $SKR balance or guard condition not met."
                : err?.message?.includes('0x1')
                    ? "Insufficient SOL for transaction fees."
                    : "Transaction Failed. Check your balance.";
            toast.error(msg, { id: loadId });
        } finally {
            setStatus('idle');
        }
    };

    if (!isMounted) return null;

    return (
        <div className={`${styles.container} ${isLocked ? styles.systemLocked : ''} ${isShaking ? styles.shake : ''}`}>
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