import React, { useState, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import { BADGE_LIST } from '../utils/badge-list';
import styles from '../styles/ClaimBadge.module.css';

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplToolbox, setComputeUnitLimit, setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';
import { publicKey, transactionBuilder } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';

import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

const SKR_MINT_STR = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
const TREASURY_ATA_STR = "Csex5aLu6U6o1mqQrxWKqEmS6cLvitcxunQXMyZoDMEM";
const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
const CLAIM_FEE = 50;
const SKR_DECIMALS = 6;

const RANK_HIERARCHY = [
  "Bronze", "Bronze Elite", "Silver", "Silver Elite", "Gold", "Gold Elite",
  "Platinum", "Diamond", "Legend", "Mythic", "Eternal", "Ascendant"
];

const CATEGORIES = ["All", "Rank", "Streak", "Quest", "Social", "Special"];

function web3IxToUmiIx(ix: any, signers: any[]) {
  return {
    instruction: {
      programId: publicKey(ix.programId.toBase58()),
      keys: ix.keys.map((k: any) => ({
        pubkey: publicKey(k.pubkey.toBase58()),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      })),
      data: ix.data,
    },
    signers,
    bytesCreatedOnChain: 0,
  };
}

export default function ClaimBadge({ user, mutate }: { user: any; mutate: () => void }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loadingBadge, setLoadingBadge] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");

  const handleClaim = async (badgeName: string) => {
    if (!wallet.publicKey || !wallet.connected) {
      return toast.error("CONNECT_WALLET");
    }

    setLoadingBadge(badgeName);
    const loadId = toast.loading(`INITIATING ${badgeName.toUpperCase()} UPLINK...`);

    try {
      const umi = createUmi(RPC_ENDPOINT)
        .use(walletAdapterIdentity(wallet))
        .use(mplToolbox());

      const userAta = await getAssociatedTokenAddress(
        new PublicKey(SKR_MINT_STR),
        wallet.publicKey
      );

      const transferIxWeb3 = createTransferCheckedInstruction(
        userAta,
        new PublicKey(SKR_MINT_STR),
        new PublicKey(TREASURY_ATA_STR),
        wallet.publicKey,
        CLAIM_FEE * Math.pow(10, SKR_DECIMALS),
        SKR_DECIMALS
      );

      const umiTransferIx = web3IxToUmiIx(transferIxWeb3, [umi.identity]);

      const builder = transactionBuilder()
        .add(setComputeUnitLimit(umi, { units: 400_000 }))
        .add(setComputeUnitPrice(umi, { microLamports: 100_000 }))
        .add(umiTransferIx);

      const { signature } = await builder.sendAndConfirm(umi, {
        send: { maxRetries: 3 },
        confirm: { commitment: 'confirmed' },
      });

      const sigString = typeof signature === 'string'
        ? signature
        : base58.deserialize(signature)[0];

      toast.loading("CONFIRMING ON-CHAIN...", { id: loadId });

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
    const completedQuests = user?.completedQuestsCount ?? 0;
    const activeBoosts = user?.purchasedBoostsCount ?? 0;
    const friendsCount = user?.friendsCount ?? 0;

    const mappedBadges = BADGE_LIST.map((badge) => {
      const isOwned = claimed.some((cb: any) => {
        const nameFromDb = cb.badge?.name?.toLowerCase().trim();
        const idFromDb = cb.badgeId?.toLowerCase().trim();
        const localName = badge.name.toLowerCase().trim();
        return nameFromDb === localName || idFromDb === localName;
      });

      let isEligible = false;

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
            isEligible = friendsCount >= (badge.min ?? 0);
          } else {
            isEligible = true;
          }
      }

      return { ...badge, isOwned, isEligible };
    });

    return mappedBadges.sort((a, b) => {
      const getPriority = (item: any) => {
        if (item.isEligible && !item.isOwned) return 0;
        if (!item.isEligible && !item.isOwned) return 1;
        return 2;
      };
      return getPriority(a) - getPriority(b);
    });
  }, [user]);

  const filteredBadges = useMemo(() => {
    if (activeCategory === "All") return badgeData;
    return badgeData.filter((b) => b.category === activeCategory);
  }, [badgeData, activeCategory]);

  // Stats for header
  const totalOwned = badgeData.filter((b) => b.isOwned).length;
  const totalClaimable = badgeData.filter((b) => b.isEligible && !b.isOwned).length;

  return (
    <div className={styles.badgeLobby}>
      {/* Header */}
      <div className={styles.lobbyHeader}>
        <div className={styles.lobbyTitleRow}>
          <h3 className={styles.lobbyTitle}>Neural Badge Repository</h3>
          <div className={styles.statsRow}>
            <span className={styles.statChip}>
              <span className={styles.statDot} data-type="owned" />
              {totalOwned} Owned
            </span>
            {totalClaimable > 0 && (
              <span className={styles.statChip} data-highlight="true">
                <span className={styles.statDot} data-type="claimable" />
                {totalClaimable} Ready
              </span>
            )}
            <span className={styles.statChip}>
              <span className={styles.statDot} data-type="total" />
              {badgeData.length} Total
            </span>
          </div>
        </div>

        {/* Category Filters */}
        <div className={styles.categoryTabs}>
          {CATEGORIES.map((cat) => {
            const count = cat === "All"
              ? badgeData.length
              : badgeData.filter((b) => b.category === cat).length;
            return (
              <button
                key={cat}
                className={`${styles.catTab} ${activeCategory === cat ? styles.catTabActive : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
                <span className={styles.catCount}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Badge Grid */}
      <div className={styles.badgeGrid}>
        {filteredBadges.map((badge) => {
          const isLocked = !badge.isEligible && !badge.isOwned;
          const canClaim = badge.isEligible && !badge.isOwned;
          const isLoading = loadingBadge === badge.name;

          return (
            <div
              key={badge.name}
              className={`${styles.badgeCard} ${isLocked ? styles.locked : ''} ${badge.isOwned ? styles.owned : ''} ${canClaim ? styles.claimable : ''}`}
            >
              {/* Status ribbon */}
              {badge.isOwned && <span className={styles.ribbon} data-status="owned">✓</span>}
              {canClaim && <span className={styles.ribbon} data-status="claim">!</span>}

              {/* Category tag */}
              {badge.category && (
                <span className={styles.categoryTag}>{badge.category}</span>
              )}

              <div className={styles.imgWrap}>
                <img src={badge.img} alt={badge.name} className={styles.badgeImg} />
                {isLoading && <div className={styles.spinnerRing} />}
              </div>

              <h4 className={styles.badgeName}>{badge.name}</h4>

              {/* Fee hint on claimable */}
              {canClaim && (
                <p className={styles.feeHint}>50 $SKR</p>
              )}

              <button
                onClick={() => canClaim && handleClaim(badge.name)}
                disabled={!canClaim || !!loadingBadge}
                className={
                  badge.isOwned ? styles.btnOwned :
                    isLocked ? styles.btnLocked :
                      styles.btnClaim
                }
              >
                {badge.isOwned
                  ? <><span className={styles.btnIcon}>✓</span> UNLOCKED</>
                  : isLoading
                    ? <><span className={styles.btnSpinner} /> WAIT...</>
                    : isLocked
                      ? <><span className={styles.btnIcon}>🔒</span> LOCKED</>
                      : <><span className={styles.btnIcon}>⚡</span> CLAIM</>
                }
              </button>
            </div>
          );
        })}
      </div>

      {filteredBadges.length === 0 && (
        <div className={styles.emptyState}>
          <span>No badges in this category</span>
        </div>
      )}
    </div>
  );
}