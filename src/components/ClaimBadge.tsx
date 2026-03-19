import React, { useState, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createTransferCheckedInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { toast } from 'react-hot-toast';
import { BADGE_LIST } from '../utils/badge-list';
import styles from '../styles/ClaimBadge.module.css';

// Constants
const SKR_MINT = new PublicKey("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");
const TREASURY_ATA = new PublicKey("Csex5aLu6U6o1mqQrxWKqEmS6cLvitcxunQXMyZoDMEM");
const CLAIM_FEE = 50;

const RANK_HIERARCHY = [
  "Bronze", "Bronze Elite", "Silver", "Silver Elite", "Gold", "Gold Elite",
  "Platinum", "Diamond", "Legend", "Mythic", "Eternal", "Ascendant"
];

export default function ClaimBadge({ user, mutate }: { user: any; mutate: () => void }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loadingBadge, setLoadingBadge] = useState<string | null>(null);

  const handleClaim = async (badgeName: string) => {
    if (!wallet.publicKey || !wallet.signTransaction) return toast.error("CONNECT_WALLET");

    setLoadingBadge(badgeName);
    const loadId = toast.loading(`INITIATING ${badgeName.toUpperCase()} UPLINK...`);

    try {
      // 1. Prepare SPL Token Transfer - SET TO 6 DECIMALS
      const userAta = await getAssociatedTokenAddress(SKR_MINT, wallet.publicKey);

      const transferIx = createTransferCheckedInstruction(
        userAta,
        SKR_MINT,
        TREASURY_ATA,
        wallet.publicKey,
        CLAIM_FEE * 1e6,
        6
      );

      const { blockhash } = await connection.getLatestBlockhash();
      const tx = new Transaction().add(transferIx);
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;

      // 2. Sign and Send
      const signed = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());

      toast.loading("CONFIRMING ON-CHAIN...", { id: loadId });
      await connection.confirmTransaction(signature, 'confirmed');

      // 3. Update Database
      const res = await fetch('/api/badges/verify-mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: wallet.publicKey.toBase58(),
          signature: signature,
          badgeRank: badgeName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "DATABASE_SYNC_FAILED");

      // 4. IMMEDIATE FRONTEND REFRESH
      await mutate();

      toast.success(`${badgeName.toUpperCase()} UNLOCKED`, { id: loadId });

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "TRANSACTION_FAILED", { id: loadId });
    } finally {
      setLoadingBadge(null);
    }
  };


  const badgeData = useMemo(() => {
    const claimed = user?.claimedBadges || [];

    // 1. Map through the list to determine status
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
          isEligible = !!(user?.username && (user?.laamPoints || 0) >= 10000 &&
            user?.hasPaidDiceEntry && user?.hasResistanceUnlocked &&
            user?.hasPulseHunterUnlocked && user?.hasPlinkoUnlocked && completedQuests >= 20);
          break;
        case "Game Master":
          isEligible = !!(user?.hasPaidDiceEntry && user?.hasResistanceUnlocked &&
            user?.hasPulseHunterUnlocked && user?.hasPlinkoUnlocked);
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
            const friends = (user?._count?.friendsSent ?? 0) + (user?._count?.friendsReceived ?? 0);
            isEligible = friends >= (badge.min ?? 0);
          } else {
            isEligible = true;
          }
      }

      return { ...badge, isOwned, isEligible };
    });

    // 2. Sort the badges: Available (0), Locked (1) , Unlocked (2)
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