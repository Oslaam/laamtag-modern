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
            // 1. Get the latest blockhash (Crucial to prevent "Transaction failed")
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

            // 2. Create Transaction with Blockhash
            const transaction = new Transaction({
                feePayer: publicKey,
                recentBlockhash: blockhash,
            }).add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: TREASURY_WALLET,
                    lamports: Math.round(priceInSol * LAMPORTS_PER_SOL),
                })
            );

            // 3. Send and Confirm
            toast.loading("Awaiting Signature...", { id: loadId });
            const signature = await sendTransaction(transaction, connection);

            toast.loading("Verifying on Blockchain...", { id: loadId });
            await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            }, 'confirmed');

            // 4. Update Database
            const res = await fetch('/api/shop/buy-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    amount: qty,
                    price: 0, // Sending 0 because they paid in SOL, not LAAM
                    signature
                }),
            });

            if (res.ok) {
                toast.success(`Acquired ${qty} TAG Tickets!`, { id: loadId });
            } else {
                toast.error("Database sync failed. Contact support with signature.", { id: loadId });
            }
        } catch (err: any) {
            console.error("Shop Error:", err);
            // Check if user rejected
            if (err.message.includes("User rejected")) {
                toast.error("Transaction declined by user.", { id: loadId });
            } else {
                toast.error("System Error: Check console for logs.", { id: loadId });
            }
        }
    };

    return (
        <SeekerGuard>
            <div className="py-8 px-4 max-w-xl mx-auto pb-32">
                <Toaster position="bottom-center" />
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black italic text-purple-500 uppercase tracking-tighter">The Armory</h1>
                    <p className="text-gray-500 text-[10px] font-bold uppercase mt-2">Exchange SOL for TAG Tickets</p>
                </div>

                <div className="grid gap-4">
                    {[
                        { qty: 5, sol: 0.05 },
                        { qty: 20, sol: 0.15 },
                        { qty: 50, sol: 0.3 }
                    ].map((item) => (
                        <div key={item.qty} className="bg-white/5 border border-white/10 p-6 rounded-[32px] flex justify-between items-center hover:border-purple-500/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <Ticket className="text-purple-500" size={24} />
                                <h3 className="font-black text-lg">{item.qty} TAG</h3>
                            </div>
                            <button
                                onClick={() => handlePurchase(item.qty, item.sol)}
                                className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-black text-xs hover:bg-purple-500 active:scale-95 transition-all shadow-lg shadow-purple-500/20"
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