import type { NextPage } from "next";
import Head from "next/head";
import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import axios from "axios";
import toast from 'react-hot-toast';
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
import { setComputeUnitLimit, setComputeUnitPrice } from "@metaplex-foundation/mpl-toolbox";

// UTILS
import { verifyCandyMachine } from '../utils/check-cm';

// --- CONSTANTS ---
const MY_CANDY_ID = "7EQyVJBqdsbe6fSjg9ZLuaFsB1cppBa9QLFJE86ziKh9";
const MY_TREASURY_ADDR = "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc";
const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
const MAX_SUPPLY = 5000;
const RENT_PER_NFT = 0.0;
const MINT_PRICE = 0.27;

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

      // 1. Fetch user stats from the API (the one we fixed from /api/status to /api/user)
      const res = await axios.get(`/api/user/${publicKey.toBase58()}`);

      // 2. Fetch Candy Machine State from Solana
      const umi = createUmi(RPC_URL).use(mplCandyMachine());
      const candyMachine = await fetchCandyMachine(umi, umiPublicKey(MY_CANDY_ID.trim()));

      // Use BigInt conversion safely for the progress bar
      const redeemed = Number(candyMachine.itemsRedeemed);
      const total = Number(candyMachine.data.itemsAvailable);

      setStats({
        global: redeemed,
        // CHANGE THIS: Use personalMinted from your Prisma schema
        personal: res.data.personalMinted || 0,
        soldOut: redeemed >= total
      });

      console.log("Stats Updated:", { redeemed, personal: res.data.personalMinted });
    } catch (e) {
      console.warn("Status Sync Error:", e);
    }
  };

  useEffect(() => {
    if (isClient && publicKey) {
      fetchStatus();
      connection.getAccountInfo(publicKey).then(info => {
        if (info) setBalance(info.lamports / LAMPORTS_PER_SOL);
      });
      const interval = setInterval(fetchStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [isClient, publicKey, connection]);

  const handleIncrement = () => { if (amount < (3 - stats.personal)) setAmount(prev => prev + 1); };
  const handleDecrement = () => { if (amount > 1) setAmount(prev => prev - 1); };

  const handleMint = async () => {
    if (!publicKey || !wallet) return;
    setLoading(true);
    try {
      const umi = createUmi(RPC_URL).use(walletAdapterIdentity(wallet)).use(mplCandyMachine());
      const candyMachine = await fetchCandyMachine(umi, umiPublicKey(MY_CANDY_ID.trim()));
      const itemsAvailable = Number(candyMachine.data?.itemsAvailable ?? 0);
      if (itemsAvailable <= 0) throw new Error("Candy Machine is SOLD OUT");

      const maxMintable = Math.min(amount, 3 - stats.personal, itemsAvailable);
      const treasuryPubkey = umiPublicKey(MY_TREASURY_ADDR.trim());
      const results = [];

      for (let i = 0; i < maxMintable; i++) {
        try {
          const nftMint = generateSigner(umi);
          const mintBuilder = mintV2(umi, {
            candyMachine: candyMachine.publicKey,
            candyGuard: candyMachine.mintAuthority,
            nftMint,
            collectionMint: candyMachine.collectionMint,
            collectionUpdateAuthority: candyMachine.authority,
            group: none(),
            mintArgs: {
              solPayment: some({ destination: treasuryPubkey }),
              mintLimit: some({ id: 1 }),
            },
          });

          const transactionBuilder = setComputeUnitLimit(umi, { units: 800000 })
            .prepend(setComputeUnitPrice(umi, { microLamports: 1000 }))
            .add(mintBuilder);

          await transactionBuilder.sendAndConfirm(umi);
          results.push({ success: true });
        } catch (err: any) {
          results.push({ success: false });
          break;
        }
      }

      const successCount = results.filter(r => r.success).length;

      if (successCount > 0) {
        // Update personalMinted count
        await axios.post('/api/user/update-mints', {
          walletAddress: publicKey.toBase58(),
          amount: successCount
        });

        // Trigger the 1000 LAAM per NFT reward
        try {
          const rewardRes = await axios.post('/api/user/reward-nft', {
            address: publicKey.toBase58(),
            mintCount: successCount
          });

          if (rewardRes.data.success) {
            alert(`🎉 SUCCESS! Minted ${successCount} NFT(s) and earned ${rewardRes.data.earned} LAAM!`);
          }
        } catch (rewardErr) {
          console.error("Reward injection failed:", rewardErr);
          alert(`Minted ${successCount} NFT(s), but points will be synced later.`);
        }

        fetchStatus();
      }
    } catch (err: any) {
      alert(err.message || "Mint process failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isClient) return null;
  const totalDisplay = (MINT_PRICE + RENT_PER_NFT) * amount;
  const displayName = stats.personal > 0 ? (publicKey?.toString().slice(0, 4) + '.skr') : "SEEKER";

  return (
    <SeekerGuard>
      <div className="main-content">
        <Head><title>LAAMTAG | Mint</title></Head>

        <div className="content-wrapper">
          {/* IMAGE SECTION */}
          <div style={{ marginBottom: '2rem', position: 'relative' }}>
            <div style={{
              background: 'rgba(234, 179, 8, 0.1)',
              borderRadius: '32px',
              padding: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <img
                src="/assets/images/nft.gif"
                alt="Laamtag NFT"
                style={{
                  width: '100%',
                  borderRadius: '24px',
                  aspectRatio: '1/1',
                  objectFit: 'cover' // Changed from objectCover to objectFit
                }}
              />
            </div>
          </div>

          {/* TEXT SECTION */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 className="page-title" style={{ color: '#eab308', marginBottom: '0.5rem' }}>Laamtag Genesis</h1>
            <p className="terminal-desc">Claim your position, <span style={{ color: '#fff', fontWeight: 'bold' }}>{displayName}</span>.</p>
            <p style={{ fontSize: '12px', fontWeight: 900, color: balance < totalDisplay ? '#ef4444' : '#eab308' }}>
              BALANCE: {balance.toFixed(3)} SOL
            </p>
          </div>

          {/* PROGRESS SECTION */}
          <div className="terminal-card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5 }}>Global Progress</span>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#eab308' }}>
                {stats.global} <span style={{ opacity: 0.3, fontSize: '10px' }}>/ {MAX_SUPPLY}</span>
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{
                width: `${(stats.global / MAX_SUPPLY) * 100}%`,
                height: '100%',
                background: '#eab308',
                boxShadow: '0 0 10px #eab308'
              }} />
            </div>
          </div>

          {/* MINT CONTROL SECTION */}
          <div className="terminal-card">
            {stats.personal >= 3 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: '#eab308', fontWeight: 900 }}>
                ALL POSITIONS CLAIMED
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', background: '#000', padding: '10px', borderRadius: '12px' }}>
                  <button onClick={handleDecrement} style={{ background: 'none', border: 'none', color: '#fff' }}><Minus /></button>
                  <span style={{ fontSize: '24px', fontWeight: 900, minWidth: '40px', textAlign: 'center' }}>{amount}</span>
                  <button onClick={handleIncrement} style={{ background: 'none', border: 'none', color: '#fff' }}><Plus /></button>
                </div>

                <button
                  onClick={handleMint}
                  disabled={loading || stats.soldOut || !connected || cmStatus !== "Candy Machine is HEALTHY"}
                  className="primary-btn"
                  style={{ opacity: (loading || stats.soldOut) ? 0.3 : 1 }}
                >
                  {loading
                    ? `MINTING ${amount} UNIT${amount > 1 ? 'S' : ''}...`
                    : stats.soldOut
                      ? "SOLD OUT"
                      : `MINT ${amount} UNIT${amount > 1 ? 'S' : ''} (~${totalDisplay.toFixed(3)} SOL)`
                  }
                </button>

                {cmStatus !== "Candy Machine is HEALTHY" && (
                  <p style={{ color: '#ef4444', fontSize: '10px', fontWeight: 900, textAlign: 'center' }}>
                    NETWORK SYNCING... PLEASE WAIT
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </SeekerGuard>
  );
};

export default Mint;