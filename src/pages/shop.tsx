import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { transferSol } from '@metaplex-foundation/mpl-toolbox';
import { publicKey as umiPublicKey, sol } from '@metaplex-foundation/umi'; // Renamed for clarity
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'; // Added PublicKey class back
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

    const wallet = useWallet();

    const umi = createUmi(connection.rpcEndpoint).use(
        walletAdapterIdentity(wallet)
    );


    const handlePurchase = async (pack: Pack) => {
        if (!publicKey) return toast.error("Connect wallet first!");

        setIsProcessing(true);
        const loadId = toast.loading(`Initiating ${pack.label}...`);

        try {
            // 1. Balance Check
            const balance = await connection.getBalance(publicKey);
            const requiredLamports = pack.price * LAMPORTS_PER_SOL;

            if (balance < (requiredLamports + 5000)) { // Price + buffer for fees
                toast.error("Insufficient SOL", { id: loadId });
                setIsProcessing(false);
                return;
            }

            toast.loading("Awaiting Signature...", { id: loadId });

            // 2. The Umi Transfer (Seeker Friendly)
            const result = await transferSol(umi, {
                // FIX: Use umiPublicKey function and TREASURY_WALLET string
                destination: umiPublicKey("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc"),
                // FIX: Use the sol() helper instead of a raw number
                amount: sol(pack.price),
            }).sendAndConfirm(umi);

            // 3. Convert Umi Signature (Uint8Array) to String for your API
            // base58 is the standard format Solana APIs expect
            const bs58 = (await import('bs58')).default;
            const signatureString = bs58.encode(result.signature);

            toast.loading("Updating Database...", { id: loadId });

            // 4. Send to your API
            const res = await fetch('/api/shop/buy-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    amount: pack.amount,
                    signature: signatureString, // Send the string, not the raw bytes
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(`✅ Success! Acquired ${pack.amount} Tickets`, { id: loadId });
                window.dispatchEvent(new Event('balanceUpdate'));
            } else {
                throw new Error(data.message || "Database sync failed");
            }
        } catch (err: any) {
            console.error("❌ Shop Error:", err);
            toast.error(err.message || "Transaction Failed", { id: loadId });
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