import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import SeekerGuard from '../components/SeekerGuard';
import ShopComponent, { Pack } from '../components/Shop';
import toast, { Toaster } from 'react-hot-toast';

const TREASURY_WALLET = new PublicKey("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc");

const SHOP_PACKS: Pack[] = [
    { amount: 1, price: 0.003, label: 'SCOUT PASS', desc: 'ENTRY ACCESS' },
    { amount: 5, price: 0.015, label: 'RUNNER PACK', desc: 'FAST TRACK START' },
    { amount: 10, price: 0.03, label: 'ELITE CACHE', desc: 'TACTICAL ADVANTAGE' },
    { amount: 50, price: 0.15, label: 'COMMANDER VAULT', desc: 'ELITE CLEARANCE', hot: true },
    { amount: 100, price: 0.3, label: 'LEGION RESERVE', desc: 'FORCE MULTIPLIER' },
    { amount: 500, price: 1.5, label: 'DYNASTY TREASURY', desc: 'ABSOLUTE DOMINANCE' }
];

export default function ShopPage() {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, signTransaction } = useWallet();
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePurchase = async (pack: Pack) => {
        if (!publicKey) return toast.error("Connect wallet first!");

        setIsProcessing(true);
        const loadId = toast.loading(`Initiating ${pack.label}...`);

        try {
            // ✅ Check balance first
            const balance = await connection.getBalance(publicKey);
            const balanceInSol = balance / LAMPORTS_PER_SOL;
            const requiredBalance = pack.price + 0.001;

            if (balanceInSol < requiredBalance) {
                toast.error(
                    `Insufficient SOL. Need ${requiredBalance.toFixed(4)} SOL (You have ${balanceInSol.toFixed(4)})`,
                    { id: loadId, duration: 5000 }
                );
                setIsProcessing(false);
                return;
            }

            // 🔥 THE FIX: Create transaction WITHOUT setting feePayer or recentBlockhash
            // Let sendTransaction handle it automatically for mobile wallets
            const transaction = new Transaction();

            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: TREASURY_WALLET,
                    lamports: Math.round(pack.price * LAMPORTS_PER_SOL),
                })
            );

            // 🔥 ONLY set these if using signTransaction (desktop path)
            // Mobile wallets handle this internally
            if (!sendTransaction && signTransaction) {
                const latestBlockhash = await connection.getLatestBlockhash('finalized');
                transaction.feePayer = publicKey;
                transaction.recentBlockhash = latestBlockhash.blockhash;
            }

            toast.loading("Awaiting Signature...", { id: loadId });

            let signature: string;

            // Try sendTransaction first (for mobile wallets), fallback to signTransaction
            if (sendTransaction) {
                // 📱 Mobile wallet adapter path
                console.log("📱 Using sendTransaction (Mobile Wallet Adapter)");

                signature = await sendTransaction(transaction, connection, {
                    skipPreflight: true,
                    maxRetries: 5,
                });

                console.log("✅ Mobile transaction sent:", signature);
            } else if (signTransaction) {
                // 💻 Desktop wallet path
                console.log("💻 Using signTransaction (Desktop Wallet)");

                const signedTx = await signTransaction(transaction);

                if (!signedTx.signatures || signedTx.signatures.length === 0 || !signedTx.signatures[0].signature) {
                    throw new Error("Transaction was not properly signed by wallet");
                }

                signature = await connection.sendRawTransaction(
                    signedTx.serialize(),
                    {
                        skipPreflight: true,
                        maxRetries: 5,
                    }
                );

                console.log("✅ Desktop transaction sent:", signature);
            } else {
                throw new Error("Wallet does not support transaction signing");
            }

            toast.loading("Verifying on Blockchain...", { id: loadId });

            // ✅ Wait for confirmation (with retry logic for mobile)
            let confirmed = false;
            let attempts = 0;
            const maxAttempts = 30;

            while (!confirmed && attempts < maxAttempts) {
                try {
                    const status = await connection.getSignatureStatus(signature);

                    if (status?.value?.confirmationStatus === 'confirmed' ||
                        status?.value?.confirmationStatus === 'finalized') {
                        confirmed = true;
                        console.log("✅ Transaction confirmed on blockchain");
                    } else if (status?.value?.err) {
                        throw new Error("Transaction failed on blockchain");
                    } else {
                        attempts++;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (err) {
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            if (!confirmed) {
                throw new Error("Transaction confirmation timeout. Please check your wallet.");
            }

            // ✅ Sync with backend
            const res = await fetch('/api/shop/buy-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    amount: pack.amount,
                    signature,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(`✅ Success! Acquired ${pack.amount} Tickets`, {
                    id: loadId,
                    duration: 4000
                });
                window.dispatchEvent(new Event('balanceUpdate'));
            } else {
                console.error("❌ API Error:", data);
                toast.error(data.message || "Database sync failed. Contact support.", {
                    id: loadId,
                    duration: 6000
                });
            }
        } catch (err: any) {
            console.error("❌ Shop Error:", err);

            let errorMessage = "Transaction Failed";
            if (err.message?.includes("User rejected") ||
                err.message?.includes("User declined") ||
                err.message?.includes("User cancelled")) {
                errorMessage = "Transaction Cancelled";
            } else if (err.message?.includes("insufficient funds") ||
                err.message?.includes("Insufficient SOL")) {
                errorMessage = "Insufficient SOL in wallet";
            } else if (err.message?.includes("not properly signed")) {
                errorMessage = "Signature failed - Please try again";
            } else if (err.message?.includes("timeout")) {
                errorMessage = "Transaction timeout - Check wallet for status";
            } else if (err.message) {
                errorMessage = err.message;
            }

            toast.error(errorMessage, { id: loadId, duration: 5000 });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <SeekerGuard>
            <div className="main-content">
                <Toaster position="bottom-center" />

                <div className="content-wrapper">
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h1 className="page-title" style={{ color: '#a855f7' }}>
                            The Armory
                        </h1>
                        <p className="terminal-desc" style={{ fontSize: '10px' }}>
                            EXCHANGE SOL FOR TAG TICKETS
                        </p>
                    </div>

                    <ShopComponent
                        packs={SHOP_PACKS}
                        loading={isProcessing}
                        onBuy={handlePurchase}
                    />

                    <div style={{
                        marginTop: '40px',
                        textAlign: 'center',
                        background: 'rgba(168, 85, 247, 0.05)',
                        padding: '16px',
                        borderRadius: '20px',
                        border: '1px dashed rgba(168, 85, 247, 0.2)'
                    }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', lineHeight: '1.5' }}>
                            Tickets are used for <strong>Gaming Modules</strong> and <strong>Quest Entry</strong>.
                            <br />
                            Purchases are processed immediately on the Solana blockchain.
                        </p>
                    </div>
                </div>
            </div>
        </SeekerGuard>
    );
}