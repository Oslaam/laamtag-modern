import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Ticket, Coins, ShoppingCart } from 'lucide-react';

export default function ShopComponent() {
    const { publicKey } = useWallet();
    const [loading, setLoading] = useState(false);

    const buyTickets = async (amount: number, price: number) => {
        if (!publicKey) return;
        setLoading(true);

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
            alert(`Success! You bought ${amount} TAG tickets.`);
            window.location.reload();
        } else {
            const data = await res.json();
            alert(data.message || "Purchase failed");
        }
        setLoading(false);
    };

    const PACKS = [
        { amount: 5, price: 500, label: "Scout Pack" },
        { amount: 12, price: 1000, label: "Operator Pack" },
        { amount: 30, price: 2000, label: "Commander Pack" },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            {PACKS.map((pack) => (
                <div key={pack.amount} className="bg-gray-900 border border-purple-500/30 p-6 rounded-[32px] text-center">
                    <Ticket className="text-purple-400 mx-auto mb-4" size={40} />
                    <h3 className="text-white font-black text-xl mb-1">{pack.label}</h3>
                    <p className="text-purple-400 font-bold mb-4">{pack.amount} TAG Tickets</p>
                    <button
                        disabled={loading}
                        onClick={() => buyTickets(pack.amount, pack.price)}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-all"
                    >
                        <Coins size={18} />
                        {pack.price} LAAM
                    </button>
                </div>
            ))}
        </div>
    );
}