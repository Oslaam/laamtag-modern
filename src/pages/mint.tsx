import type { NextPage } from "next";
import Head from "next/head";
import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import axios from "axios";
import { Minus, Plus, Crown } from "lucide-react";
import SeekerGuard from "../components/SeekerGuard";
import styles from "../styles/Mint.module.css"; // CSS Module Import

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
  transactionBuilder,
} from "@metaplex-foundation/umi";
import { mplToolbox, setComputeUnitLimit, setComputeUnitPrice } from "@metaplex-foundation/mpl-toolbox";
import { verifyCandyMachine } from '../utils/check-cm';

const MY_CANDY_ID = "7EQyVJBqdsbe6fSjg9ZLuaFsB1cppBa9QLFJE86ziKh9";
const MY_TREASURY_ADDR = "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc";
const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
const MAX_SUPPLY = 5000;
const RENT_PER_NFT = 0.0;
const MINT_PRICE = 0.37;

const Mint: NextPage = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected } = wallet;

  const [isClient, setIsClient] = useState(false);
  const [stats, setStats] = useState({ global: 0, personal: 0, soldOut: false });
  const [username, setUsername] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(1);
  const [cmStatus, setCmStatus] = useState("Checking...");

  useEffect(() => {
    setIsClient(true);
    const checkHealth = async () => {
      try {
        const status = await verifyCandyMachine();
        setCmStatus(status);
      } catch (err) {
        console.error("Health Check Failed", err);
        setCmStatus("CONNECTION ERROR");
      }
    };
    if (isClient) checkHealth();
  }, [isClient]);

  const fetchStatus = async () => {
    try {
      if (!publicKey) return;
      const res = await axios.get(`/api/user/${publicKey.toBase58()}`);
      const umi = createUmi(RPC_URL).use(mplCandyMachine());
      const candyMachine = await fetchCandyMachine(umi, umiPublicKey(MY_CANDY_ID.trim()));
      const redeemed = Number(candyMachine.itemsRedeemed);
      const total = Number(candyMachine.data.itemsAvailable);
      setStats({
        global: redeemed,
        personal: res.data.personalMinted || 0,
        soldOut: redeemed >= total
      });
      setUsername(res.data.username || null);
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

  const handleIncrement = () => {
    if (amount < (10 - stats.personal)) setAmount(prev => prev + 1);
  };
  const handleDecrement = () => { if (amount > 1) setAmount(prev => prev - 1); };

  const handleMint = async () => {
    if (!publicKey || !wallet) return;
    setLoading(true);
    try {
      const umi = createUmi(RPC_URL).use(walletAdapterIdentity(wallet)).use(mplCandyMachine()).use(mplToolbox());
      const candyMachine = await fetchCandyMachine(umi, umiPublicKey(MY_CANDY_ID.trim()));
      const itemsAvailable = Number(candyMachine.data?.itemsAvailable ?? 0);
      if (itemsAvailable <= 0) throw new Error("Candy Machine is SOLD OUT");

      const maxMintable = Math.min(amount, 10 - stats.personal, itemsAvailable);
      const treasuryPubkey = umiPublicKey(MY_TREASURY_ADDR.trim());

      let builder = transactionBuilder()
        .add(setComputeUnitLimit(umi, { units: 800_000 }))
        .add(setComputeUnitPrice(umi, { microLamports: 100_000 }));

      for (let i = 0; i < amount; i++) {
        const nftMint = generateSigner(umi);
        builder = builder.add(
          mintV2(umi, {
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
          })
        );
      }

      await builder.sendAndConfirm(umi);
      await axios.post('/api/user/update-mints', {
        walletAddress: publicKey.toBase58(),
        actualCount: stats.personal + amount,
        amountMinted: amount
      });

      const rewardRes = await axios.post('/api/user/reward-nft', {
        address: publicKey.toBase58(),
        mintCount: amount
      });

      alert(`🎉 SUCCESS! Minted ${amount} NFT(s) and earned ${rewardRes.data.earned} LAAM!`);
      fetchStatus();
    } catch (err: any) {
      console.error("MINT_ERROR:", err);
      alert(err.message || "Simulation failed. Ensure you have enough SOL for price + fees.");
    } finally {
      setLoading(false);
    }
  };

  if (!isClient) return null;
  const totalDisplay = (MINT_PRICE + RENT_PER_NFT) * amount;

  return (
    <SeekerGuard>
      <div className="main-content">
        <Head><title>LAAMTAG | Mint</title></Head>

        <div className="content-wrapper">
          {/* IMAGE SECTION */}
          <div className={styles.imageContainer}>
            <div className={styles.imageOuter}>
              <img
                src="/assets/images/nft.gif"
                alt="Laamtag NFT"
                className={styles.nftGif}
              />
            </div>
          </div>

          {/* TEXT SECTION */}
          <div className={styles.textSection}>
            <h1 className={`page-title ${styles.title}`}>Laamtag Genesis</h1>

            <div className={styles.userRow}>
              <p className="terminal-desc" style={{ margin: 0 }}>
                Claim your position,
              </p>
              <span
                className={styles.usernameDisplay}
                style={{ color: username ? '#eab308' : '#fff' }}
              >
                {username && <Crown size={12} />}
                {username || (publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : 'SEEKER')}
              </span>
            </div>

            <p
              className={styles.balanceText}
              style={{ color: balance < totalDisplay ? '#ef4444' : '#eab308' }}
            >
              BALANCE: {balance.toFixed(3)} SOL
            </p>
          </div>

          {/* PROGRESS SECTION */}
          <div className="terminal-card" style={{ marginBottom: '2rem' }}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>Global Progress</span>
              <span className={styles.progressValue}>
                {stats.global} <span style={{ opacity: 0.3, fontSize: '10px' }}>/ {MAX_SUPPLY}</span>
              </span>
            </div>
            <div className={styles.progressBarTrack}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${(stats.global / MAX_SUPPLY) * 100}%` }}
              />
            </div>
          </div>

          {/* MINT CONTROLS */}
          <div className="terminal-card">
            {stats.personal >= 10 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: '#eab308', fontWeight: 900 }}>
                ALL POSITIONS CLAIMED
              </div>
            ) : (
              <div className={styles.controlRow}>
                <div className={styles.counterBox}>
                  <button onClick={handleDecrement} className={styles.counterBtn}><Minus /></button>
                  <span className={styles.amountDisplay}>{amount}</span>
                  <button onClick={handleIncrement} className={styles.counterBtn}><Plus /></button>
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
                  <p className={styles.statusText} style={{ color: '#ef4444' }}>
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