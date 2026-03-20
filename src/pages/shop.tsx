import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { transferSol } from '@metaplex-foundation/mpl-toolbox';
import { publicKey as umiPublicKey, sol } from '@metaplex-foundation/umi';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import SeekerGuard from '../components/SeekerGuard';
import ShopComponent, { Pack } from '../components/Shop';
import toast, { Toaster } from 'react-hot-toast';
import styles from '../styles/Shop.module.css';

const TREASURY_WALLET = new PublicKey('CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc');

const SHOP_PACKS: Pack[] = [
    { amount: 1,   price: 0.003, label: 'SCOUT PASS',        desc: 'ENTRY ACCESS' },
    { amount: 5,   price: 0.015, label: 'RUNNER PACK',       desc: 'FAST TRACK START' },
    { amount: 10,  price: 0.03,  label: 'ELITE CACHE',       desc: 'TACTICAL ADVANTAGE' },
    { amount: 50,  price: 0.15,  label: 'COMMANDER VAULT',   desc: 'ELITE CLEARANCE',   hot: true },
    { amount: 100, price: 0.3,   label: 'LEGION RESERVE',    desc: 'FORCE MULTIPLIER' },
    { amount: 500, price: 1.5,   label: 'DYNASTY TREASURY',  desc: 'ABSOLUTE DOMINANCE' },
];

export default function ShopPage() {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [isProcessing, setIsProcessing] = useState(false);
    const wallet = useWallet();

    const umi = createUmi(connection.rpcEndpoint).use(walletAdapterIdentity(wallet));

    const handlePurchase = async (pack: Pack) => {
        if (!publicKey) return toast.error('Connect wallet first!');
        setIsProcessing(true);
        const loadId = toast.loading(`Initiating ${pack.label}...`);
        try {
            const balance = await connection.getBalance(publicKey);
            const requiredLamports = pack.price * LAMPORTS_PER_SOL;
            if (balance < requiredLamports + 5000) {
                toast.error('Insufficient SOL', { id: loadId });
                return;
            }
            toast.loading('Awaiting Signature...', { id: loadId });
            const result = await transferSol(umi, {
                destination: umiPublicKey('CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc'),
                amount: sol(pack.price),
            }).sendAndConfirm(umi);

            const bs58 = (await import('bs58')).default;
            const signatureString = bs58.encode(result.signature);
            toast.loading('Updating Database...', { id: loadId });

            const res = await fetch('/api/shop/buy-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    amount: pack.amount,
                    signature: signatureString,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Acquired ${pack.amount} Tickets`, { id: loadId });
                window.dispatchEvent(new Event('balanceUpdate'));
            } else {
                throw new Error(data.message || 'Database sync failed');
            }
        } catch (err: any) {
            toast.error(err.message || 'Transaction Failed', { id: loadId });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <SeekerGuard>
            <div className="main-content">
                <Toaster position="bottom-center" />
                <div className="content-wrapper">

                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>The Armory</h1>
                        <p className={styles.pageSubtitle}>EXCHANGE SOL FOR TAG TICKETS</p>
                    </div>

                    <ShopComponent packs={SHOP_PACKS} loading={isProcessing} onBuy={handlePurchase} />

                    <div className={styles.infoStrip}>
                        <p className={styles.infoText}>
                            Tickets are used for <strong>Gaming Modules</strong> and <strong>Quest Entry</strong>.
                            Purchases are processed immediately on the Solana blockchain.
                        </p>
                    </div>

                </div>
            </div>
        </SeekerGuard>
    );
}