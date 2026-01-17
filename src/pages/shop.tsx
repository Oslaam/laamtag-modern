import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import SeekerGuard from '../components/SeekerGuard';
import { Ticket } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const TREASURY_WALLET = new PublicKey("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc");

export default function ShopPage() {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    const handlePurchase = async (qty: number, priceInSol: number) => {
        if (!publicKey) return toast.error("Connect wallet first!");
        const loadId = toast.loading("Initializing Terminal...");

        try {
            const latestBlockhash = await connection.getLatestBlockhash('confirmed');

            const transaction = new Transaction();
            transaction.feePayer = publicKey;
            transaction.recentBlockhash = latestBlockhash.blockhash;

            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: TREASURY_WALLET,
                    lamports: Math.round(priceInSol * LAMPORTS_PER_SOL),
                })
            );


            toast.loading("Awaiting Signature...", { id: loadId });
            const signature = await sendTransaction(transaction, connection);


            toast.loading("Verifying (Approx 30s)...", { id: loadId });

            // --- TIMEOUT LOGIC START ---
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), 60000); // 60 second limit

            try {
                await connection.confirmTransaction(
                    {
                        signature,
                        blockhash: latestBlockhash.blockhash,
                        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                    },
                    'confirmed'
                );

                clearTimeout(timeoutId);
            } catch (e) {
                // If it takes longer than 60s, don't crash, just tell user to check balance
                throw new Error("Confirmation taking too long. Please check your wallet balance in a minute.");
            }
            // --- TIMEOUT LOGIC END ---

            const res = await fetch('/api/shop/buy-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    amount: qty,
                    signature
                }),
            });

            if (res.ok) {
                toast.success(`Acquired ${qty} TAG Tickets!`, { id: loadId });
                window.dispatchEvent(new Event('balanceUpdate'));
            } else {
                toast.error("Database sync failed.", { id: loadId });
            }
        } catch (err: any) {
            console.error("Shop Error:", err);
            toast.error(err.message.includes("User rejected") ? "Declined" : err.message, { id: loadId });
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

                    {/* ITEMS LIST */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[
                            { qty: 1, sol: 0.015, label: 'SCOUT PASS' },
                            { qty: 5, sol: 0.075, label: 'RUNNER PACK' },
                            { qty: 10, sol: 0.15, label: 'ELITE CACHE' },
                            { qty: 50, sol: 0.75, label: 'COMMANDER VAULT', hot: true },
                            { qty: 100, sol: 1.5, label: 'LEGION RESERVE' },
                            { qty: 500, sol: 7.5, label: 'DYNASTY TREASURY' }
                        ].map((item) => (
                            <div
                                key={item.qty}
                                className="terminal-card"
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '20px 24px',
                                    border: item.hot ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: item.hot ? '0 0 20px rgba(168, 85, 247, 0.15)' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        background: 'rgba(168, 85, 247, 0.1)',
                                        padding: '12px',
                                        borderRadius: '16px'
                                    }}>
                                        <Ticket className="text-purple-500" size={24} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '8px', fontWeight: 900, color: '#a855f7', marginBottom: '4px' }}>
                                            {item.label}
                                        </p>
                                        <h3 style={{ fontSize: '20px', fontWeight: 900, margin: 0 }}>
                                            {item.qty} <span style={{ fontSize: '12px', opacity: 0.5 }}>TAG</span>
                                        </h3>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handlePurchase(item.qty, item.sol)}
                                    className="primary-btn"
                                    style={{
                                        width: 'auto',
                                        padding: '12px 24px',
                                        backgroundColor: '#a855f7',
                                        fontSize: '12px',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 900,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {item.sol} SOL
                                </button>
                            </div>
                        ))}
                    </div>

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