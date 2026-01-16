'use client';

import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Ticket, Zap, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TREASURY_WALLET = new PublicKey("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc");

export default function ShopComponent() {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const [loading, setLoading] = useState(false);

    const buyTickets = async (amount: number, priceInSol: number) => {
        if (!publicKey) return toast.error("CONNECT WALLET");
        setLoading(true);

        try {
            // 1. PREPARE TRANSACTION
            const latestBlockhash = await connection.getLatestBlockhash('confirmed');

            const transaction = new Transaction({
                feePayer: publicKey,
                recentBlockhash: latestBlockhash.blockhash,
            }).add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: TREASURY_WALLET,
                    lamports: Math.round(priceInSol * LAMPORTS_PER_SOL),
                })
            );

            // 2. SEND TRANSACTION
            // For Mobile: sendTransaction handles the heavy lifting
            const signature = await sendTransaction(transaction, connection);

            // 3. ROBUST CONFIRMATION (Crucial for Mobile)
            // Instead of just waiting, we use the blockhash strategy to prevent "System Error"
            await connection.confirmTransaction({
                signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
            }, 'confirmed');

            // 4. UPDATE DATABASE
            const res = await fetch('/api/shop/buy-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    amount,
                    signature
                })
            });

            if (res.ok) {
                toast.success(`ACQUIRED ${amount} TAG TICKETS`);
                // Trigger global balance update without full page reload
                window.dispatchEvent(new Event('balanceUpdate'));
            } else {
                const data = await res.json();
                toast.error(data.message || "DATABASE SYNC FAILED");
            }
        } catch (err: any) {
            console.error("Shop Error:", err);
            // Friendly error messages for mobile users
            if (err.message?.includes("User rejected")) {
                toast.error("TRANSACTION DECLINED");
            } else {
                toast.error("BLOCKCHAIN TIMEOUT - CHECK WALLET");
            }
        } finally {
            setLoading(false);
        }
    };

    // ... (rest of your PACKS array and return statement stay the same)
    const PACKS = [
        { amount: 1, price: 0.015, label: "Scout Pass", desc: "ENTRY ACCESS" },
        { amount: 5, price: 0.075, label: "Runner Pack", desc: "FAST TRACK START" },
        { amount: 10, price: 0.15, label: "Elite Cache", desc: "TACTICAL ADVANTAGE" },
        { amount: 50, price: 0.75, label: "Commander Vault", desc: "ELITE CLEARANCE", hot: true },
        { amount: 100, price: 1.5, label: "Legion Reserve", desc: "FORCE MULTIPLIER" },
        { amount: 500, price: 7.5, label: "Dynasty Treasury", desc: "ABSOLUTE DOMINANCE" }
    ];

    if (!publicKey) return null;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', padding: '24px 0' }}>
            {PACKS.map((pack) => (
                <div key={pack.amount} className="terminal-card" style={{
                    textAlign: 'center',
                    padding: '32px 24px',
                    border: pack.hot ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: pack.hot ? '0 0 20px rgba(168, 85, 247, 0.15)' : 'none'
                }}>
                    <div style={{ marginBottom: '20px', display: 'inline-flex', padding: '16px', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '24px', border: '1px solid rgba(168, 85, 247, 0.1)' }}>
                        <Ticket className="text-purple-500" size={32} />
                    </div>

                    <h3 style={{ color: '#fff', fontWeight: 900, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 4px 0' }}>
                        {pack.label}
                    </h3>
                    <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                        {pack.desc}
                    </p>

                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '12px', marginBottom: '24px', border: '1px dotted rgba(255,255,255,0.1)' }}>
                        <p style={{ color: '#a855f7', fontWeight: 900, fontSize: '20px', margin: 0 }}>
                            {pack.amount} <span style={{ fontSize: '10px', color: '#fff' }}>TICKETS</span>
                        </p>
                    </div>

                    <button
                        disabled={loading}
                        onClick={() => buyTickets(pack.amount, pack.price)}
                        className="terminal-button"
                        style={{
                            width: '100%',
                            background: '#a855f7',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            fontWeight: 900
                        }}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={16} />
                        ) : (
                            <>
                                <Zap size={14} fill="currentColor" />
                                <span>REQUISITION: {pack.price} SOL</span>
                            </>
                        )}
                    </button>
                </div>
            ))}
        </div>
    );
}