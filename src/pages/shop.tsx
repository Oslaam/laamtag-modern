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
    const { publicKey, sendTransaction } = useWallet();
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePurchase = async (pack: Pack) => {
        if (!publicKey) return toast.error("Connect wallet first!");
        if (!sendTransaction) return toast.error("Wallet not ready");

        setIsProcessing(true);
        const loadId = toast.loading(`Initiating ${pack.label}...`);

        try {
            // Check balance
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

            // ✅ CRITICAL: Get blockhash FIRST
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

            // ✅ CRITICAL: Set recentBlockhash and feePayer in constructor
            const transaction = new Transaction({
                recentBlockhash: blockhash,
                feePayer: publicKey,
            }).add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: TREASURY_WALLET,
                    lamports: Math.round(pack.price * LAMPORTS_PER_SOL),
                })
            );

            toast.loading("Awaiting Signature...", { id: loadId });

            const signature = await sendTransaction(transaction, connection, {
                skipPreflight: false,
            });

            toast.loading("Verifying on Blockchain...", { id: loadId });

            await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight,
            }, 'confirmed');

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
                toast.error(data.message || "Database sync failed.", {
                    id: loadId,
                    duration: 6000
                });
            }
        } catch (err: any) {
            console.error("❌ Shop Error:", err);

            let errorMessage = "Transaction Failed";
            if (err.message?.includes("User rejected") || err.message?.includes("User cancelled")) {
                errorMessage = "Transaction Cancelled";
            } else if (err.message?.includes("insufficient")) {
                errorMessage = "Insufficient SOL";
            } else if (err.message?.includes("recentBlockhash required")) {
                errorMessage = "Connection error - Please try again";
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