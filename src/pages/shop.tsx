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

        const loadId = toast.loading("Processing transaction...");

        try {
            // 1. Create Transaction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: TREASURY_WALLET,
                    lamports: priceInSol * LAMPORTS_PER_SOL,
                })
            );

            // 2. Send and Confirm Transaction
            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            // 3. Only if blockchain succeeds, update the database
            const res = await fetch('/api/shop/buy-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    amount: qty,
                    signature // Send signature for extra security verification if needed
                }),
            });

            if (res.ok) {
                toast.success(`Acquired ${qty} TAG Tickets!`, { id: loadId });
            } else {
                toast.error("Database sync failed. Contact support with your signature.", { id: loadId });
            }
        } catch (err) {
            console.error(err);
            toast.error("Transaction cancelled or failed.", { id: loadId });
        }
    };

    return (
        <SeekerGuard>
            <div className="py-8 px-4 max-w-xl mx-auto pb-32">
                <Toaster />
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black italic text-purple-500 uppercase tracking-tighter">The Armory</h1>
                    <p className="text-gray-500 text-[10px] font-bold uppercase mt-2">Send SOL to receive TAG Tickets</p>
                </div>

                <div className="grid gap-4">
                    {[
                        { qty: 5, sol: 0.05 },
                        { qty: 20, sol: 0.15 },
                        { qty: 50, sol: 0.3 }
                    ].map((item) => (
                        <div key={item.qty} className="bg-white/5 border border-white/10 p-6 rounded-[32px] flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <Ticket className="text-purple-500" size={24} />
                                <h3 className="font-black text-lg">{item.qty} TAG</h3>
                            </div>
                            <button
                                onClick={() => handlePurchase(item.qty, item.sol)}
                                className="bg-purple-500 text-white px-6 py-2 rounded-xl font-black text-xs hover:bg-purple-400"
                            >
                                {item.sol} SOL
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </SeekerGuard>
    );
}