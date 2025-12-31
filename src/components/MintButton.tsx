"use client";

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { FC, useCallback } from 'react';

export const MintButton: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    const onClick = useCallback(async () => {
        if (!publicKey) {
            alert('Please connect your wallet first!');
            return;
        }

        try {
            // 1. Create a simple transaction (Example: sending 0.01 SOL to a treasury)
            // Replace 'YOUR_TREASURY_ADDRESS' with your actual minting wallet
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: new PublicKey('YOUR_TREASURY_ADDRESS_HERE'),
                    lamports: 0.01 * LAMPORTS_PER_SOL,
                })
            );

            const signature = await sendTransaction(transaction, connection);
            alert('Minting Request Sent! Signature: ' + signature);
            
            await connection.confirmTransaction(signature, 'processed');
            alert('Mint Successful!');
        } catch (error) {
            console.error('Mint failed:', error);
        }
    }, [publicKey, sendTransaction, connection]);

    return (
        <button 
            onClick={onClick}
            disabled={!publicKey}
            className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
        >
            <span> {publicKey ? 'Mint LaamTag' : 'Connect Wallet to Mint'} </span>
        </button>
    );
};