import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import SeekerGuard from '../components/SeekerGuard';
import ShopComponent, { Pack } from '../components/Shop'; // Importing your UI-only component
import toast, { Toaster } from 'react-hot-toast';

const TREASURY_WALLET = new PublicKey("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc");

// We define the data here so the logic and data stay together
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
    const { publicKey, signTransaction } = useWallet();
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePurchase = async (pack: Pack) => {
        if (!publicKey) return toast.error("Connect wallet first!");

        setIsProcessing(true);
        const loadId = toast.loading(`Initiating ${pack.label}...`);

        try {
            const latestBlockhash = await connection.getLatestBlockhash('confirmed');

            const transaction = new Transaction({
                feePayer: publicKey,
                recentBlockhash: latestBlockhash.blockhash,
            }).add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: TREASURY_WALLET,
                    lamports: Math.round(pack.price * LAMPORTS_PER_SOL),
                })
            );

            if (!signTransaction) throw new Error("Wallet does not support signing");

            toast.loading("Awaiting Signature...", { id: loadId });
            const signedTx = await signTransaction(transaction);

            const signature = await connection.sendRawTransaction(
                signedTx.serialize(),
                { skipPreflight: false }
            );

            toast.loading("Verifying on Blockchain...", { id: loadId });

            await connection.confirmTransaction({
                signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
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

            if (res.ok) {
                toast.success(`Success! Acquired ${pack.amount} Tickets`, { id: loadId });
                window.dispatchEvent(new Event('balanceUpdate'));
            } else {
                toast.error("Database sync failed.", { id: loadId });
            }
        } catch (err: any) {
            console.error("Shop Error:", err);
            toast.error(
                err.message?.includes("User rejected")
                    ? "Transaction Cancelled"
                    : "Transaction Failed",
                { id: loadId }
            );
        } finally {
            setIsProcessing(false);
        }
    };


    return (
        <SeekerGuard>
            <div className="main-content">
                <Toaster position="bottom-center" />

                <div className="content-wrapper">
                    {/* HEADER */}
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h1 className="page-title" style={{ color: '#a855f7' }}>
                            The Armory
                        </h1>
                        <p className="terminal-desc" style={{ fontSize: '10px' }}>
                            EXCHANGE SOL FOR TAG TICKETS
                        </p>
                    </div>

                    {/* UI COMPONENT 
                        We pass the packs, the loading state, and the function
                    */}
                    <ShopComponent
                        packs={SHOP_PACKS}
                        loading={isProcessing}
                        onBuy={handlePurchase}
                    />

                    {/* FOOTER NOTE */}
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