import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import toast, { Toaster } from 'react-hot-toast';
import SeekerGuard from '../components/SeekerGuard';

export default function VaultPage() {
  const { publicKey } = useWallet();
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);

  const fetchVaultStatus = async () => {
    if (!publicKey) return;
    try {
      const res = await fetch(`/api/claim-nft-reward?address=${publicKey.toString()}`);
      const data = await res.json();
      if (data.hasClaimed) setHasClaimed(true);
    } catch (err) {
      console.error("Vault status error", err);
    }
  };

  useEffect(() => { fetchVaultStatus(); }, [publicKey]);

  const handleClaim = async () => {
    if (!publicKey) return toast.error("Connect Wallet");
    setIsClaiming(true);
    try {
      const res = await fetch('/api/claim-nft-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toString() })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("1,000 LAAM SECURED");
        setHasClaimed(true);
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      toast.error("Verification failed");
    } finally {
      setIsClaiming(false);
    }
  };

  const displayName = publicKey ? `${publicKey.toString().slice(0, 4)}.skr` : "Seeker";

  return (
    <SeekerGuard>
      <div className="pb-20">
        <Head><title>LAAMTAG | The Vault</title></Head>
        <Toaster />

        <div className="text-center mb-16 pt-10">
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase">
            The <span className="text-yellow-500">Vault</span>
          </h1>
          <p className="text-gray-500 font-bold tracking-widest mt-2 text-[10px]">EXCLUSIVE FOR {displayName}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-[40px] p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-yellow-500/10 blur-[100px] rounded-full"></div>

          <div className="relative z-10">
            <div className="text-6xl mb-6">🔒</div>
            <h2 className="text-2xl font-black italic uppercase mb-4">Genesis Holder Reward</h2>
            <p className="text-gray-400 max-w-md mx-auto mb-8 text-sm">
              Your LaamTag NFT is your key. Genesis members can claim a one-time bonus of 1,000 LAAM.
            </p>

            <div className="flex flex-col items-center gap-4">
              <div className="bg-black/50 border border-gray-800 px-6 py-3 rounded-2xl">
                <span className="text-yellow-500 font-black text-xl">+1,000 LAAM</span>
              </div>

              <button
                onClick={handleClaim}
                disabled={hasClaimed || isClaiming}
                className={`mt-4 w-full max-w-xs py-4 rounded-2xl font-black uppercase transition-all ${hasClaimed
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                    : 'bg-yellow-500 text-black hover:bg-yellow-400'
                  }`}
              >
                {hasClaimed ? "REWARD CLAIMED ✓" : isClaiming ? "VERIFYING..." : "CLAIM 1,000 LAAM"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </SeekerGuard>
  );
}