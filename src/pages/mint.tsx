import type { NextPage } from "next";
import Head from "next/head";
import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import axios from "axios";
import { Minus, Plus, Crown, Zap, AlertTriangle } from "lucide-react";
import SeekerGuard from "../components/SeekerGuard";
import styles from "../styles/Mint.module.css";

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
      } catch {
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
        soldOut: redeemed >= total,
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
    if (amount < (20 - stats.personal)) setAmount(prev => prev + 1);
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
        amountMinted: amount,
      });

      const rewardRes = await axios.post('/api/user/reward-nft', {
        address: publicKey.toBase58(),
        mintCount: amount,
      });

      alert(`SUCCESS! Minted ${amount} NFT(s) and earned ${rewardRes.data.earned} LAAM!`);
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
  const progressPct = Math.min((stats.global / MAX_SUPPLY) * 100, 100);
  const isHealthy = cmStatus === "Candy Machine is HEALTHY";
  const canMint = !loading && !stats.soldOut && connected && isHealthy;
  const remaining = 20 - stats.personal;

  return (
    <SeekerGuard>
      <div className="main-content">
        <Head><title>LAAMTAG | Mint</title></Head>

        <div className={`content-wrapper ${styles.page}`}>

          {/* ── NFT IMAGE ── */}
          <div className={styles.imageSection}>
            <div className={styles.imageFrame}>
              <div className={styles.imageCornerTL} />
              <div className={styles.imageCornerTR} />
              <div className={styles.imageCornerBL} />
              <div className={styles.imageCornerBR} />
              <img src="/assets/images/nft.gif" alt="Laamtag NFT" className={styles.nftGif} />
              <div className={styles.imageLabel}>GENESIS COLLECTION</div>
            </div>
          </div>

          {/* ── TITLE + USER ROW ── */}
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Laamtag</h1>
              <span className={styles.titleSub}>Genesis</span>
            </div>
            <div className={styles.userRow}>
              <span className={styles.userLabel}>Claim your position,</span>
              <span className={`${styles.username} ${username ? styles.usernameGold : ''}`}>
                {username && <Crown size={11} />}
                {username || (publicKey
                  ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
                  : 'SEEKER')}
              </span>
            </div>
            <div className={styles.balanceRow}>
              <span className={styles.balanceLabel}>Balance</span>
              <span className={`${styles.balanceValue} ${balance < totalDisplay ? styles.balanceLow : styles.balanceOk}`}>
                {balance.toFixed(3)} SOL
              </span>
              {balance < totalDisplay && (
                <span className={styles.balanceWarn}>
                  <AlertTriangle size={10} /> INSUFFICIENT
                </span>
              )}
            </div>
          </div>

          {/* ── STATS STRIP ── */}
          <div className={styles.statsStrip}>
            <div className={styles.statItem}>
              <span className={styles.statVal}>{stats.global.toLocaleString()}</span>
              <span className={styles.statLabel}>MINTED</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statVal}>{(MAX_SUPPLY - stats.global).toLocaleString()}</span>
              <span className={styles.statLabel}>REMAINING</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statVal}>{stats.personal}</span>
              <span className={styles.statLabel}>YOURS</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statVal}>{MINT_PRICE} SOL</span>
              <span className={styles.statLabel}>PRICE</span>
            </div>
          </div>

          {/* ── PROGRESS ── */}
          <div className={styles.progressCard}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>Global Supply</span>
              <span className={styles.progressValue}>
                {stats.global.toLocaleString()}
                <span className={styles.progressMax}> / {MAX_SUPPLY.toLocaleString()}</span>
              </span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
              <div className={styles.progressGlow} style={{ left: `${progressPct}%` }} />
            </div>
            <div className={styles.progressPct}>{progressPct.toFixed(1)}% claimed</div>
          </div>

          {/* ── MINT CONTROLS ── */}
          <div className={styles.mintCard}>
            {stats.personal >= 20 ? (
              <div className={styles.maxedOut}>
                <Crown size={18} color="#eab308" />
                <span>ALL POSITIONS CLAIMED</span>
              </div>
            ) : (
              <>
                <div className={styles.mintHeader}>
                  <span className={styles.mintLabel}>Select Quantity</span>
                  <span className={styles.mintRemaining}>{remaining} remaining</span>
                </div>

                <div className={styles.counterRow}>
                  <button
                    onClick={handleDecrement}
                    disabled={amount <= 1}
                    className={styles.counterBtn}
                  >
                    <Minus size={16} />
                  </button>
                  <div className={styles.amountBox}>
                    <span className={styles.amountVal}>{amount}</span>
                    <span className={styles.amountSub}>unit{amount > 1 ? 's' : ''}</span>
                  </div>
                  <button
                    onClick={handleIncrement}
                    disabled={amount >= remaining}
                    className={styles.counterBtn}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className={styles.costRow}>
                  <span className={styles.costLabel}>Total cost</span>
                  <span className={styles.costValue}>~{totalDisplay.toFixed(3)} SOL</span>
                </div>

                <button
                  onClick={handleMint}
                  disabled={!canMint}
                  className={`${styles.mintBtn} ${!canMint ? styles.mintBtnDisabled : ''}`}
                >
                  {loading ? (
                    <>
                      <span className={styles.mintBtnSpinner} />
                      MINTING {amount} UNIT{amount > 1 ? 'S' : ''}...
                    </>
                  ) : stats.soldOut ? (
                    'SOLD OUT'
                  ) : (
                    <>
                      <Zap size={14} fill="#000" />
                      MINT {amount} UNIT{amount > 1 ? 'S' : ''}
                    </>
                  )}
                </button>

                {!isHealthy && (
                  <p className={styles.statusWarn}>
                    <AlertTriangle size={10} />
                    NETWORK SYNCING — PLEASE WAIT
                  </p>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </SeekerGuard>
  );
};

export default Mint;