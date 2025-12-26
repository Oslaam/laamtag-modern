import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction } from '@solana/web3.js';

export default function Home() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [status, setStatus] = useState({ globalMinted: 0, maxSupply: 3000 });
  const [loading, setLoading] = useState(false);

  const API_BASE = "https://laamtag-production.up.railway.app";

  useEffect(() => {
    const updateStatus = async () => {
      const address = publicKey ? publicKey.toBase58() : "none";
      try {
        const res = await fetch(`${API_BASE}/status/${address}`);
        const data = await res.json();
        setStatus(data);
      } catch (e) { console.error(e); }
    };
    updateStatus();
  }, [publicKey]);

  const handleMint = async () => {
    if (!publicKey) return alert("Please connect your Seeker wallet!");
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: publicKey.toBase58() })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);

      if (data.transaction) {
        const tx = Transaction.from(Buffer.from(data.transaction, 'base64'));
        const signature = await sendTransaction(tx, connection);
        await connection.confirmTransaction(signature, 'confirmed');
        alert("Success! Check your Seeker Vault.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000B17] text-white">
      <Head><title>LaamTag | Seeker Exclusive</title></Head>

      <main className="flex flex-col items-center py-10 px-4">
        <h1 className="text-5xl font-bold mb-8 bg-gradient-to-r from-white to-[#81e757] bg-clip-text text-transparent">
          Seeker Genesis Mint
        </h1>
        
        <div className="flex justify-center mb-10">
          {/* This button will now show "Mobile Wallet" (Seed Vault) automatically */}
          <WalletMultiButton className="!bg-[#5B2CA0] hover:!bg-[#81e757] !rounded-xl !transition-all" />
        </div>

        <section className="bg-[#0a1625] p-8 rounded-3xl border border-[#1e3a5f] shadow-2xl max-w-sm w-full">
          <img src="/laamtag-image-NObg.png" className="w-full mb-6" alt="NFT" />
          <div className="flex justify-between text-sm mb-4">
            <span className="text-gray-400">Total Minted</span>
            <span className="text-[#81e757] font-bold">{status.globalMinted} / {status.maxSupply}</span>
          </div>
          <button 
            disabled={loading || !publicKey}
            onClick={handleMint}
            className="w-full py-4 bg-[#81e757] text-black font-bold rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
          >
            {loading ? "MINTING..." : publicKey ? "CLAIM NFT" : "CONNECT TO MINT"}
          </button>
        </section>
      </main>
    </div>
  );
}