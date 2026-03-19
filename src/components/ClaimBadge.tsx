import React, { useState, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import { BADGE_LIST } from '../utils/badge-list';
import styles from '../styles/ClaimBadge.module.css';

// UMI imports (umi 0.9.x compatible — no umi-web3js-adapters needed)
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplToolbox, setComputeUnitLimit, setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';
import { publicKey, transactionBuilder } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';

// SPL Token + web3.js — used only for ATA derivation & instruction building
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

// Constants
const SKR_MINT_STR = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
const TREASURY_ATA_STR = "Csex5aLu6U6o1mqQrxWKqEmS6cLvitcxunQXMyZoDMEM";
const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
const CLAIM_FEE = 50;
const SKR_DECIMALS = 6;

const RANK_HIERARCHY = [
  "Bronze", "Bronze Elite", "Silver", "Silver Elite", "Gold", "Gold Elite",
  "Platinum", "Diamond", "Legend", "Mythic", "Eternal", "Ascendant"
];

// ---------------------------------------------------------------------------
// Manual web3.js → UMI instruction bridge (no umi-web3js-adapters required)
// Converts a web3.js TransactionInstruction into the shape UMI's
// transactionBuilder expects. Works with umi 0.9.x.
// ---------------------------------------------------------------------------
function web3IxToUmiIx(ix: any, signers: any[]) {
  return {
    instruction: {
      programId: publicKey(ix.programId.toBase58()),
      keys: ix.keys.map((k: any) => ({
        pubkey: publicKey(k.pubkey.toBase58()),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      })),
      data: ix.data, // Uint8Array — UMI accepts this directly
    },
    signers,
    bytesCreatedOnChain: 0,
  };
}

export default function ClaimBadge({ user, mutate }: { user: any; mutate: () => void }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loadingBadge, setLoadingBadge] = useState<string | null>(null);

  const handleClaim = async (badgeName: string) => {
    if (!wallet.publicKey || !wallet.connected) {
      return toast.error("CONNECT_WALLET");
    }

    setLoadingBadge(badgeName);
    const loadId = toast.loading(`INITIATING ${badgeName.toUpperCase()} UPLINK...`);

    try {
      // 1. Build UMI — identical pattern to Collectable.tsx
      const umi = createUmi(RPC_ENDPOINT)
        .use(walletAdapterIdentity(wallet))
        .use(mplToolbox());

      // 2. Derive user's $SKR ATA via web3.js
      const userAta = await getAssociatedTokenAddress(
        new PublicKey(SKR_MINT_STR),
        wallet.publicKey
      );

      // 3. Build SPL token transfer instruction via web3.js helper
      const transferIxWeb3 = createTransferCheckedInstruction(
        userAta,                                        // source (user's ATA)
        new PublicKey(SKR_MINT_STR),                    // mint
        new PublicKey(TREASURY_ATA_STR),                // destination (treasury ATA)
        wallet.publicKey,                               // owner / signer
        CLAIM_FEE * Math.pow(10, SKR_DECIMALS),         // 50 * 1e6 raw units
        SKR_DECIMALS
      );

      // 4. Convert to UMI instruction shape — no adapter package needed
      const umiTransferIx = web3IxToUmiIx(transferIxWeb3, [umi.identity]);

      // 5. Build full transaction with compute budget + SPL transfer
      const builder = transactionBuilder()
        .add(setComputeUnitLimit(umi, { units: 400_000 }))
        .add(setComputeUnitPrice(umi, { microLamports: 100_000 }))
        .add(umiTransferIx);

      // 6. Send and confirm via UMI
      //    UMI calls wallet.sendTransaction internally — supported by MWA on Solana Mobile
      const { signature } = await builder.sendAndConfirm(umi, {
        send: { maxRetries: 3 },
        confirm: { commitment: 'confirmed' },
      });

      // 7. Deserialize signature to base58 string
      const sigString = typeof signature === 'string'
        ? signature
        : base58.deserialize(signature)[0];

      toast.loading("CONFIRMING ON-CHAIN...", { id: loadId });

      // 8. Only sync to DB after confirmed on-chain success — prevents ghost writes
      const res = await fetch('/api/badges/verify-mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: wallet.publicKey.toBase58(),
          signature: sigString,
          badgeRank: badgeName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "DATABASE_SYNC_FAILED");

      // 9. Immediate frontend refresh
      await mutate();

      toast.success(`${badgeName.toUpperCase()} UNLOCKED`, { id: loadId });

    } catch (err: any) {
      console.error("BADGE_CLAIM_ERROR:", err);

      const msg =
        err?.message?.includes('custom program error') || err?.message?.includes('0x1')
          ? "Insufficient $SKR balance."
          : err?.message?.includes('insufficient lamports') || err?.message?.includes('0x0')
            ? "Insufficient SOL for fees."
            : err?.message || "TRANSACTION_FAILED";

      toast.error(msg, { id: loadId });
    } finally {
      setLoadingBadge(null);
    }
  };

  const badgeData = useMemo(() => {
    const claimed = user?.claimedBadges || [];

    const mappedBadges = BADGE_LIST.map((badge) => {
      const isOwned = claimed.some((cb: any) => {
        const nameFromDb = cb.badge?.name?.toLowerCase().trim();
        const idFromDb = cb.badgeId?.toLowerCase().trim();
        const localName = badge.name.toLowerCase().trim();
        return nameFromDb === localName || idFromDb === localName;
      });

      let isEligible = false;
      const completedQuests = user?._count?.quests ?? 0;
      const activeBoosts = user?._count?.boosts ?? 0;

      switch (badge.name) {
        case "Early Adopter":
          isEligible = !!(
            user?.username &&
            (user?.laamPoints || 0) >= 10000 &&
            user?.hasPaidDiceEntry &&
            user?.hasResistanceUnlocked &&
            user?.hasPulseHunterUnlocked &&
            user?.hasPlinkoUnlocked &&
            completedQuests >= 20
          );
          break;
        case "Game Master":
          isEligible = !!(
            user?.hasPaidDiceEntry &&
            user?.hasResistanceUnlocked &&
            user?.hasPulseHunterUnlocked &&
            user?.hasPlinkoUnlocked
          );
          break;
        case "Booster":
          isEligible = activeBoosts >= 10;
          break;
        case "Warrior Claimer":
          isEligible = (user?.warriorMinted || 0) >= 5;
          break;
        case "Genesis Staker":
          isEligible = (user?.personalMinted || 0) >= 3;
          break;
        default:
          if (badge.category === "Rank") {
            const userIdx = RANK_HIERARCHY.indexOf(user?.rank || "Bronze");
            const reqIdx = RANK_HIERARCHY.indexOf(badge.name);
            isEligible = userIdx >= reqIdx;
          } else if (badge.category === "Streak") {
            isEligible = (user?.streakCount || 0) >= (badge.min ?? 0);
          } else if (badge.category === "Quest") {
            isEligible = completedQuests >= (badge.min ?? 0);
          } else if (badge.category === "Social") {
            const friends =
              (user?._count?.friendsSent ?? 0) + (user?._count?.friendsReceived ?? 0);
            isEligible = friends >= (badge.min ?? 0);
          } else {
            isEligible = true;
          }
      }

      return { ...badge, isOwned, isEligible };
    });

    // Sort: Available (0) → Locked (1) → Unlocked (2)
    return mappedBadges.sort((a, b) => {
      const getPriority = (item: any) => {
        if (item.isEligible && !item.isOwned) return 0;
        if (!item.isEligible && !item.isOwned) return 1;
        return 2;
      };
      return getPriority(a) - getPriority(b);
    });
  }, [user]);

  return (
    <div className={styles.badgeLobby}>
      <h3 className={styles.lobbyTitle}>Neural Badge Repository</h3>
      <div className={styles.badgeGrid}>
        {badgeData.map((badge) => {
          const isLocked = !badge.isEligible && !badge.isOwned;
          const canClaim = badge.isEligible && !badge.isOwned;

          return (
            <div
              key={badge.name}
              className={`${styles.badgeCard} ${isLocked ? styles.locked : ''}`}
            >
              <img src={badge.img} alt={badge.name} className={styles.badgeImg} />
              <h4 className={styles.badgeName}>{badge.name}</h4>
              <button
                onClick={() => canClaim && handleClaim(badge.name)}
                disabled={!canClaim || !!loadingBadge}
                className={
                  badge.isOwned ? styles.btnOwned :
                    isLocked ? styles.btnLocked :
                      styles.btnClaim
                }
              >
                {badge.isOwned ? "UNLOCKED" :
                  loadingBadge === badge.name ? "WAIT..." :
                    isLocked ? "LOCKED" : "CLAIM"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}