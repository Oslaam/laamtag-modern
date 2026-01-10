/* eslint-disable @next/next/no-img-element */
import type { NextPage } from "next";
import Head from "next/head";
import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import axios from "axios";
import { Minus, Plus } from "lucide-react";
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
// Add 'setComputeUnitPrice' to this list
import { setComputeUnitLimit, setComputeUnitPrice } from "@metaplex-foundation/mpl-toolbox";


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

  // Check Candy Machine health
  useEffect(() => {
    setIsClient(true);
    verifyCandyMachine().then(status => setCmStatus(status));
  }, []);

  // Fetch mint stats and balance
  const fetchStatus = async () => {
    try {
      if (!publicKey) return;

      // 1. Get personal stats from your Railway API
      const res = await axios.get(`/api/status/${publicKey.toBase58()}`);

      // 2. Get LIVE global progress directly from the Blockchain (Like Sugar Show)
      const umi = createUmi(RPC_URL).use(mplCandyMachine());
      const candyMachine = await fetchCandyMachine(
        umi,
        umiPublicKey(MY_CANDY_ID.trim())
      );

      const itemsRedeemed = Number(candyMachine.itemsRedeemed);
      const isSoldOut = itemsRedeemed >= MAX_SUPPLY;

      // 3. Update the UI with real-time data
      setStats({
        global: itemsRedeemed, // This will now show "3" instead of "0"
        personal: res.data.personalMinted || 0,
        soldOut: isSoldOut
      });

      console.log(`Live Sync: ${itemsRedeemed} / ${MAX_SUPPLY}`);
    } catch (e) {
      console.warn("Status Sync Error:", e);
    }
  };
  useEffect(() => {
    if (isClient && publicKey) {
      fetchStatus();

      // Refresh balance
      connection.getAccountInfo(publicKey).then(info => {
        if (info) setBalance(info.lamports / LAMPORTS_PER_SOL);
      });

      // ADD THIS: Refresh the progress bar every 30 seconds
      const interval = setInterval(fetchStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [isClient, publicKey, connection]);

  const handleIncrement = () => { if (amount < (3 - stats.personal)) setAmount(prev => prev + 1); };
  const handleDecrement = () => { if (amount > 1) setAmount(prev => prev - 1); };

  // -----------------------------
  // HANDLE MINT (UPDATED VERSION)
  // -----------------------------
  const handleMint = async () => {
    if (!publicKey || !wallet) return;
    setLoading(true);

    try {
      const umi = createUmi(RPC_URL)
        .use(walletAdapterIdentity(wallet))
        .use(mplCandyMachine());

      const candyMachine = await fetchCandyMachine(
        umi,
        umiPublicKey(MY_CANDY_ID.trim())
      );

      const itemsAvailable = Number(candyMachine.data?.itemsAvailable ?? 0);
      if (itemsAvailable <= 0) throw new Error("Candy Machine is SOLD OUT");

      // Calculate safe mint amount
      const maxMintable = Math.min(amount, 3 - stats.personal, itemsAvailable);
      const treasuryPubkey = umiPublicKey(MY_TREASURY_ADDR.trim());

      const results: { success: boolean; signature?: string; error?: string }[] = [];

      for (let i = 0; i < maxMintable; i++) {
        try {
          console.log(`Starting mint ${i + 1} of ${maxMintable}...`);
          const nftMint = generateSigner(umi);

          const mintBuilder = mintV2(umi, {
            candyMachine: candyMachine.publicKey,
            candyGuard: candyMachine.mintAuthority, // Auto-detects the guard from CM
            nftMint,
            collectionMint: candyMachine.collectionMint,
            collectionUpdateAuthority: candyMachine.authority,
            group: none(),
            mintArgs: {
              solPayment: some({ destination: treasuryPubkey }),
              mintLimit: some({ id: 1 }), // Confirmed by your sugar output
            },
          });

          // Correct Compute Unit Pricing for Umi 1.0+
          const transactionBuilder = setComputeUnitLimit(umi, { units: 800000 })
            .prepend(setComputeUnitPrice(umi, { microLamports: 1000 })) // This is the v0.9.x standard
            .add(mintBuilder);
          const result = await transactionBuilder.sendAndConfirm(umi);
          const sigHex = Buffer.from(result.signature).toString("hex");

          results.push({ success: true, signature: sigHex });
          console.log(`✅ Mint #${i + 1} Success! Signature:`, sigHex);

        } catch (err: any) {
          console.error(`❌ Mint #${i + 1} Failed:`, err);
          results.push({ success: false, error: err.message || "Unknown error" });
          break; // Stop loop on failure to save user gas
        }
      }

      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
        alert(`🎉 Success! Minted ${successCount} Seeker NFT(s)!`);
        fetchStatus();
      } else {
        alert(`❌ Mint failed. Check console for details.`);
      }

    } catch (err: any) {
      console.error("GLOBAL MINT ERROR:", err);
      alert(err.message || "Mint process failed to start");
    } finally {
      setLoading(false);
    }
  };
  if (!isClient) return null;
  const totalDisplay = (MINT_PRICE + RENT_PER_NFT) * amount;
  const displayName = publicKey ? `${publicKey.toString().slice(0, 4)}.skr` : "Seeker";

  return (
    <SeekerGuard>
      <div className="text-white font-sans">
        <Head><title>LAAMTAG | Mint</title></Head>
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
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      {/* Pulsing Live Dot */}
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                      </span>
                    </div>
                    <h2 className="text-xs font-bold uppercase text-white/40 mt-1">Global Progress</h2>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black italic text-yellow-500 tracking-tighter">
                      {stats.global.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-white/20 uppercase ml-2">
                      / {MAX_SUPPLY.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Progress Bar Container */}
                <div className="w-full h-3 bg-white/5 rounded-full border border-white/10 p-[2px] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                    style={{ width: `${Math.max((stats.global / MAX_SUPPLY) * 100, 1)}%` }}
                  />
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
                    <p className="text-sm text-gray-400 italic font-medium">Mint and Claim. You can mint 3 - Max.</p>
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
      </div>
    </SeekerGuard>
  );
};

export default Mint;
