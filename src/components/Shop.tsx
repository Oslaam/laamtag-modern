'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Ticket, Coins, ShoppingCart, Zap, Loader2 } from 'lucide-react';

export default function ShopComponent() {
    const { publicKey } = useWallet();
    const [loading, setLoading] = useState(false);

    const buyTickets = async (amount: number, price: number) => {
        if (!publicKey) return;
        setLoading(true);

        try {
            const res = await fetch('/api/user/buy-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    amount,
                    price
                })
            });

            if (res.ok) {
                alert(`TRANSMISSION COMPLETE: ${amount} TAG tickets acquired.`);
                window.location.reload();
            } else {
                const data = await res.json();
                alert(data.message || "PURCHASE REJECTED");
            }
        } catch (err) {
            console.error(err);
            alert("COMMUNICATION ERROR");
        } finally {
            setLoading(false);
        }
    };

    const PACKS = [
        { amount: 5, price: 500, label: "Scout Pack", desc: "BASIC RECONNAISSANCE" },
        { amount: 12, price: 1000, label: "Operator Pack", desc: "TACTICAL ADVANTAGE" },
        { amount: 30, price: 2000, label: "Commander Pack", desc: "ELITE CLEARANCE" },
    ];

    if (!publicKey) return null;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', padding: '24px 0' }}>
            {PACKS.map((pack) => (
                <div key={pack.amount} className="terminal-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
                    <div style={{ marginBottom: '20px', display: 'inline-flex', padding: '16px', background: 'rgba(234, 179, 8, 0.05)', borderRadius: '24px', border: '1px solid rgba(234, 179, 8, 0.1)' }}>
                        <Ticket className="text-yellow-500" size={32} />
                    </div>
                    
                    <h3 style={{ color: '#fff', fontWeight: 900, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 4px 0' }}>
                        {pack.label}
                    </h3>
                    <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                        {pack.desc}
                    </p>

                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '12px', marginBottom: '24px', border: '1px dotted rgba(255,255,255,0.1)' }}>
                        <p style={{ color: '#eab308', fontWeight: 900, fontSize: '20px', margin: 0 }}>
                            {pack.amount} <span style={{ fontSize: '10px', color: '#fff' }}>TICKETS</span>
                        </p>
                    </div>

                    <button
                        disabled={loading}
                        onClick={() => buyTickets(pack.amount, pack.price)}
                        className="terminal-button"
                        style={{ 
                            width: '100%', 
                            background: '#eab308', 
                            color: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={16} />
                        ) : (
                            <>
                                <Zap size={14} fill="currentColor" />
                                <span>REQUISITION: {pack.price} LAAM</span>
                            </>
                        )}
                    </button>
                </div>
            ))}
        </div>
    );
}