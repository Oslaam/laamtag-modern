/* eslint-disable @next/next/no-img-element */
import type { NextPage } from "next";
import Head from "next/head";
import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import axios from "axios";
import { Minus, Plus } from "lucide-react";
import Navbar from "../components/Navbar";
import AppFooter from "../components/AppFooter";
import SeekerGuard from "../components/SeekerGuard";

// METAPLEX IMPORTS
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import {
  mintV2,
  mplCandyMachine,
  fetchCandyMachine,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  publicKey as umiPublicKey,
  some,
  none,
  generateSigner,
} from "@metaplex-foundation/umi";
import {
  setComputeUnitLimit,
  setComputeUnitPrice
} from "@metaplex-foundation/mpl-essentials";

// UTILS
import { verifyCandyMachine } from '../utils/check-cm';

// --- CONSTANTS ---
const MY_CANDY_ID = "7EQyVJBqdsbe6fSjg9ZLuaFsB1cppBa9QLFJE86ziKh9";
const MY_TREASURY_ADDR = "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc";
const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
const MAX_SUPPLY = 5000;
const RENT_PER_NFT = 0.0;
const MINT_PRICE = 0.001; // Matches your testing guard price

const Mint: NextPage = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected } = wallet;

  const [isClient, setIsClient] = useState(false);
  const [stats, setStats] = useState({ global: 0, personal: 0, soldOut: false });
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(1);

  const [cmStatus, setCmStatus] = useState("Checking...");

  useEffect(() => {
    setIsClient(true);
    verifyCandyMachine().then(status => setCmStatus(status));
  }, []);

  const fetchStatus = async () => {
    try {
      if (!publicKey) return;
      const res = await axios.get(`https://laamtag-production.up.railway.app/status/${publicKey.toBase58()}`);
      setStats({
        global: res.data.globalMinted || 0,
        personal: res.data.personalMinted || 0,
        soldOut: res.data.isSoldOut || false
      });
    } catch (e) { console.warn("API Error:", e); }
  };

  useEffect(() => {
    if (isClient && publicKey) {
      fetchStatus();
      connection.getAccountInfo(publicKey).then(info => {
        if (info) setBalance(info.lamports / LAMPORTS_PER_SOL);
      });
    }
  }, [isClient, publicKey, connection]);

  const handleIncrement = () => { if (amount < (3 - stats.personal)) setAmount(prev => prev + 1); };
  const handleDecrement = () => { if (amount > 1) setAmount(prev => prev - 1); };

 const handleMint = async () => {
  if (!publicKey) return;
  setLoading(true);

  try {
    const umi = createUmi(RPC_URL)
      .use(walletAdapterIdentity(wallet))
      .use(mplCandyMachine());

    const candyMachine = await fetchCandyMachine(umi, umiPublicKey(MY_CANDY_ID));

    // 1. Create the base mint builder
    let mintBuilder = mintV2(umi, {
      candyMachine: candyMachine.publicKey,
      candyGuard: candyMachine.mintAuthority,
      nftMint: generateSigner(umi),
      collectionMint: candyMachine.collectionMint,
      collectionUpdateAuthority: candyMachine.authority,
      group: none(),
      mintArgs: {
        solPayment: some({ destination: umiPublicKey(MY_TREASURY_ADDR) }),
        mintLimit: some({ id: 1 })
      },
    });

    // 2. Add Compute Budget "Fuel" (MANDATORY)
    // We use .add() to combine the builders manually
    const transactionBuilder = setComputeUnitLimit(umi, { units: 800000 })
      .add(mintBuilder);

    // 3. Send and Confirm
    const result = await transactionBuilder.sendAndConfirm(umi);

    // Success handling
    const signature = Buffer.from(result.signature).toString('hex');
    console.log("Mint Signature:", signature);
    
    setStats(prev => ({
      ...prev,
      global: prev.global + amount,
      personal: prev.personal + amount
    }));

    alert("🎉 SUCCESS! Your LAAMTAG Box is being delivered.");
    fetchStatus();

  } catch (err: any) {
    console.error("MINT ERROR:", err);
    alert("Mint failed: " + (err.message || "Check SOL balance or try again."));
  } finally {
    setLoading(false);
  }
};
  if (!isClient) return null;
  const totalDisplay = (MINT_PRICE + RENT_PER_NFT) * amount;
  const displayName = publicKey ? `${publicKey.toString().slice(0, 4)}.skr` : "Seeker";

  return (
    <SeekerGuard>
      <div className="min-h-screen bg-black text-white font-sans pb-32">
        <Head><title>LAAMTAG | Mint</title></Head>
        <Navbar />
        <main className="max-w-6xl mx-auto py-12 px-6">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="w-full lg:w-1/2 relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 to-purple-600 rounded-[40px] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative bg-gray-900 rounded-[38px] border border-white/10 overflow-hidden shadow-2xl">
                <img src="/assets/images/nft.gif" alt="Laamtag NFT" className="w-full aspect-square object-cover" />
              </div>
            </div>

            <div className="w-full lg:w-1/2 space-y-8 text-left">
              <div>
                <h1 className="text-6xl font-black italic tracking-tighter text-yellow-500 uppercase leading-none">Laamtag Genesis</h1>
                <p className="mt-4 text-gray-400 text-lg">Claim your position, <span className="text-white font-bold">{displayName}</span>.</p>
                <div className="flex items-center gap-4 mt-2">
                  <p className={`text-sm font-mono ${balance < totalDisplay ? 'text-red-500' : 'text-yellow-500'}`}>
                    Balance: {balance.toFixed(3)} SOL
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold uppercase text-yellow-500">
                  <span>Progress</span>
                  <span> {stats.global} / {MAX_SUPPLY}</span>
                </div>
                <div className="w-full h-4 bg-gray-900 rounded-full border border-white/5 p-1">
                  <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all duration-1000" style={{ width: `${(stats.global / MAX_SUPPLY) * 100}%` }} />
                </div>
              </div>

              {cmStatus !== "Candy Machine is HEALTHY" && (
                <div className="bg-red-500/20 border border-red-500 p-4 rounded-2xl text-center">
                  <p className="text-red-500 font-black uppercase text-xs animate-pulse">
                    {cmStatus === "Checking..." ? "Syncing Solana..." : "Network Maintenance: Minting Paused"}
                  </p>
                </div>
              )}

              <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6 shadow-2xl backdrop-blur-sm">
                {stats.personal >= 3 ? (
                  <div className="py-6 text-center border-2 border-yellow-500 rounded-2xl bg-yellow-500/10">
                    <p className="text-yellow-500 font-black">ALL POSITIONS CLAIMED</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-400 italic font-medium">Mint {stats.personal}/3. You can mint {3 - stats.personal} more.</p>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex items-center bg-black border border-white/20 rounded-2xl p-1 w-full sm:w-auto">
                        <button onClick={handleDecrement} className="w-12 h-12 flex items-center justify-center"><Minus size={18} /></button>
                        <span className="w-16 text-center font-black text-2xl">{amount}</span>
                        <button onClick={handleIncrement} className="w-12 h-12 flex items-center justify-center"><Plus size={18} /></button>
                      </div>
                      <button
                        onClick={handleMint}
                        disabled={loading || stats.soldOut || !connected || cmStatus !== "Candy Machine is HEALTHY"}
                        className="flex-1 w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-2xl text-xl disabled:opacity-20 transition-all"
                      >
                        {loading ? "Confirming..." : cmStatus !== "Candy Machine is HEALTHY" ? "LOCKED" : stats.soldOut ? "Sold Out" : `Mint Now (~${totalDisplay.toFixed(3)} SOL)`}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
        <AppFooter />
      </div>
    </SeekerGuard>
  );
};

export default Mint;