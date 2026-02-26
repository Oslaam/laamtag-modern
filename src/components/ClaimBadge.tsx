// import React, { useState, useMemo } from 'react';
// import { useWallet } from '@solana/wallet-adapter-react';
// import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
// import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
// import { mplCandyMachine, mintV2, fetchCandyMachine } from '@metaplex-foundation/mpl-candy-machine';
// import { setComputeUnitLimit, setComputeUnitPrice, mplToolbox } from '@metaplex-foundation/mpl-toolbox';
// import { generateSigner, publicKey, some, transactionBuilder } from '@metaplex-foundation/umi';
// import { toast } from 'react-hot-toast';
// import { BADGE_MAP } from '../utils/badge-map';
// import styles from '../styles/ClaimBadge.module.css';

// const BADGE_LIST = [
//   { name: "Early Adopter", min: null, img: "/assets/badges/early-adopter.png" },
//   { name: "Genesis Staker", min: null, img: "/assets/badges/genesis-staker.png" },
//   { name: "Warrior Claimer", min: null, img: "/assets/badges/warrior-claimer.png" },
//   { name: "Bronze", min: 0, img: "/assets/badges/bronze.png" },
//   { name: "Bronze Elite", min: 5000, img: "/assets/badges/bronze-elite.png" },
//   { name: "Silver", min: 10000, img: "/assets/badges/silver.png" },
//   { name: "Silver Elite", min: 20000, img: "/assets/badges/silver-elite.png" },
//   { name: "Gold", min: 50000, img: "/assets/badges/gold.png" },
//   { name: "Gold Elite", min: 100000, img: "/assets/badges/gold-elite.png" },
//   { name: "Platinum", min: 200000, img: "/assets/badges/platinum.png" },
//   { name: "Diamond", min: 300000, img: "/assets/badges/diamond.png" },
//   { name: "Legend", min: 400000, img: "/assets/badges/legend.png" },
//   { name: "Mythic", min: 500000, img: "/assets/badges/mythic.png" },
//   { name: "Eternal", min: 750000, img: "/assets/badges/eternal.png" },
//   { name: "Ascendant", min: 1000000, img: "/assets/badges/ascendant.png" },
//   { name: "10-Day Pulse", min: 10, img: "/assets/badges/daily-streak-10.png" },
//   { name: "30-Day Pulse", min: 30, img: "/assets/badges/daily-streak-30.png" },
//   { name: "50-Day Pulse", min: 50, img: "/assets/badges/daily-streak-50.png" },
//   { name: "100-Day Pulse", min: 100, img: "/assets/badges/daily-streak-100.png" },
//   { name: "30-Quest Master", min: 30, img: "/assets/badges/quest-master-30.png" },
//   { name: "50-Quest Master", min: 50, img: "/assets/badges/quest-master-50.png" },
//   { name: "100-Quest Master", min: 100, img: "/assets/badges/quest-master-100.png" },
//   { name: "20-Social Link", min: 20, img: "/assets/badges/friends-20.png" },
//   { name: "30-Social Link", min: 30, img: "/assets/badges/friends-30.png" },
//   { name: "50-Social Link", min: 50, img: "/assets/badges/friends-50.png" },
//   { name: "100-Social Link", min: 100, img: "/assets/badges/friends-100.png" },
//   { name: "Booster", min: 10, img: "/assets/badges/booster.png" },
//   { name: "Game Master", min: null, img: "/assets/badges/game-master.png" },
// ];

// export default function ClaimBadge({ user, mutate }: { user: any; mutate: () => void }) {
//   const wallet = useWallet();
//   const [mintingName, setMintingName] = useState<string | null>(null);

//   const handleClaim = async (badgeName: string) => {
//     if (!wallet.publicKey) return toast.error("CONNECT_WALLET");
//     const badgeData = BADGE_MAP[badgeName as keyof typeof BADGE_MAP];
//     if (!badgeData) return toast.error("CONFIG_NOT_FOUND");

//     setMintingName(badgeName);
//     const loadId = toast.loading(`UPLINKING ${badgeName.toUpperCase()}...`);

//     try {
//       const RPC = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
//       const umi = createUmi(RPC).use(walletAdapterIdentity(wallet)).use(mplToolbox()).use(mplCandyMachine());

//       const authRes = await fetch('/api/badges/generate-signature', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ walletAddress: wallet.publicKey.toBase58(), requestedRank: badgeName })
//       });

//       const authData = await authRes.json();
//       if (!authRes.ok) throw new Error(authData.error);

//       const candyMachineAddress = publicKey(badgeData.cmId);
//       const nftMint = generateSigner(umi);
//       const candyMachine = await fetchCandyMachine(umi, candyMachineAddress);

//       const { signature } = await transactionBuilder()
//         .add(setComputeUnitLimit(umi, { units: 600_000 }))
//         .add(setComputeUnitPrice(umi, { microLamports: 200_000 }))
//         .add(mintV2(umi, {
//           candyMachine: candyMachineAddress,
//           candyGuard: candyMachine.mintAuthority,
//           collectionMint: publicKey(badgeData.collectionId),
//           collectionUpdateAuthority: candyMachine.authority,
//           nftMint,
//           mintArgs: {
//             thirdPartySigner: some({ signer: publicKey(authData.signerAddress) }),
//             mintLimit: some({ id: badgeData.limitId }),
//             solPayment: some({ destination: publicKey("DFyPyuo78ww81vpp6BT5MGQVLkomrBCQXwcmSpEDJzDN") }),
//           },
//         }))
//         .sendAndConfirm(umi);

//       await fetch('/api/badges/verify-mint', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ walletAddress: wallet.publicKey.toBase58(), signature: signature.toString(), badgeRank: badgeName })
//       });

//       toast.success("MINT_SUCCESSFUL", { id: loadId });
//       mutate();
//     } catch (err: any) {
//       toast.error(err.message || "MINT_FAILED", { id: loadId });
//     } finally {
//       setMintingName(null);
//     }
//   };

//   // Logic to sort and calculate stats
//   const sortedBadges = useMemo(() => {
//     const list = BADGE_LIST.map(badge => {
//       const isOwned = user.claimedBadges?.some((cb: any) => cb.badge.name === badge.name);
//       let isEligible = false;

//       // Eligibility Check Logic
//       if (badge.name === "Early Adopter") {
//         isEligible = !!user.username && user.laamPoints >= 10000 && user.tagTickets >= 100 &&
//           user.hasPaidDiceEntry && user.hasResistanceUnlocked && user.hasPulseHunterUnlocked &&
//           user.personalMinted > 0 && user.warriorMinted > 0 &&
//           (user.completedQuestsCount || 0) >= 20 && (user.purchasedBoostsCount || 0) > 0;
//       } else if (badge.name === "Genesis Staker") {
//         isEligible = (user.personalMinted || 0) >= 3;
//       } else if (badge.name === "Warrior Claimer") {
//         isEligible = (user.warriorMinted || 0) >= 3;
//       } else if (badge.name === "Booster") {
//         isEligible = (user.purchasedBoostsCount || 0) >= 10;
//       } else if (badge.name === "Game Master") {
//         isEligible = user.hasPaidDiceEntry && user.hasResistanceUnlocked && user.hasPulseHunterUnlocked;
//       } else if (badge.name.includes("-Day Pulse")) {
//         isEligible = (user.streakCount || 0) >= (badge.min ?? 0);
//       } else if (badge.name.includes("-Quest Master")) {
//         isEligible = (user.completedQuestsCount || 0) >= (badge.min ?? 0);
//       } else if (badge.name.includes("-Social Link")) {
//         isEligible = (user.friendsCount || 0) >= (badge.min ?? 0);
//       } else {
//         isEligible = (user.laamPoints || 0) >= (badge.min ?? 0);
//       }

//       return { ...badge, isOwned, isEligible };
//     });

//     // Sorting: 1st Available (Eligible & Not Owned), 2nd Locked (Not Eligible), 3rd Claimed (Owned)
//     return list.sort((a, b) => {
//       if (a.isOwned !== b.isOwned) return a.isOwned ? 1 : -1; // Claimed goes to bottom
//       if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1; // Available goes to top
//       return 0;
//     });
//   }, [user]);

//   const claimedCount = user.claimedBadges?.length || 0;
//   const totalBadges = BADGE_LIST.length;

//   return (
//     <div className={styles.badgeLobby}>
//       <h2 className={styles.lobbyTitle}>
//         NEURAL BADGE UPLINK: <span style={{ color: '#eab308' }}>{claimedCount}/{totalBadges} COLLECTED</span>
//       </h2>

//       <div className={styles.badgeGrid}>
//         {sortedBadges.map((badge) => (
//           <div key={badge.name} className={`${styles.badgeCard} ${(!badge.isEligible && !badge.isOwned) ? styles.locked : ''}`}>
//             <img src={badge.img} alt={badge.name} className={styles.badgeImg} />
//             <h3 className={styles.badgeName}>{badge.name.toUpperCase()}</h3>

//             <button
//               onClick={() => handleClaim(badge.name)}
//               disabled={!!mintingName || !badge.isEligible || badge.isOwned}
//               className={badge.isOwned ? styles.btnOwned : badge.isEligible ? styles.btnClaim : styles.btnLocked}
//             >
//               {badge.isOwned ? "CLAIMED" : mintingName === badge.name ? "..." : badge.isEligible ? "CLAIM" : "LOCKED"}
//             </button>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }


import React, { useState, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplCandyMachine, mintV2, fetchCandyMachine } from '@metaplex-foundation/mpl-candy-machine';
import { setComputeUnitLimit, setComputeUnitPrice, mplToolbox } from '@metaplex-foundation/mpl-toolbox';
import { generateSigner, publicKey, some, transactionBuilder } from '@metaplex-foundation/umi';
import { toast } from 'react-hot-toast';
import { BADGE_MAP } from '../utils/badge-map';
import styles from '../styles/ClaimBadge.module.css';

const BADGE_LIST = [
  { name: "Early Adopter", min: null, img: "/assets/badges/early-adopter.png" },
  { name: "Genesis Staker", min: null, img: "/assets/badges/genesis-staker.png" },
  { name: "Warrior Claimer", min: null, img: "/assets/badges/warrior-claimer.png" },
  { name: "Bronze", min: 0, img: "/assets/badges/bronze.png" },
  { name: "Bronze Elite", min: 5000, img: "/assets/badges/bronze-elite.png" },
  { name: "Silver", min: 10000, img: "/assets/badges/silver.png" },
  { name: "Silver Elite", min: 20000, img: "/assets/badges/silver-elite.png" },
  { name: "Gold", min: 50000, img: "/assets/badges/gold.png" },
  { name: "Gold Elite", min: 100000, img: "/assets/badges/gold-elite.png" },
  { name: "Platinum", min: 200000, img: "/assets/badges/platinum.png" },
  { name: "Diamond", min: 300000, img: "/assets/badges/diamond.png" },
  { name: "Legend", min: 400000, img: "/assets/badges/legend.png" },
  { name: "Mythic", min: 500000, img: "/assets/badges/mythic.png" },
  { name: "Eternal", min: 750000, img: "/assets/badges/eternal.png" },
  { name: "Ascendant", min: 1000000, img: "/assets/badges/ascendant.png" },
  { name: "10-Day Pulse", min: 10, img: "/assets/badges/daily-streak-10.png" },
  { name: "30-Day Pulse", min: 30, img: "/assets/badges/daily-streak-30.png" },
  { name: "50-Day Pulse", min: 50, img: "/assets/badges/daily-streak-50.png" },
  { name: "100-Day Pulse", min: 100, img: "/assets/badges/daily-streak-100.png" },
  { name: "30-Quest Master", min: 30, img: "/assets/badges/quest-master-30.png" },
  { name: "50-Quest Master", min: 50, img: "/assets/badges/quest-master-50.png" },
  { name: "100-Quest Master", min: 100, img: "/assets/badges/quest-master-100.png" },
  { name: "20-Social Link", min: 20, img: "/assets/badges/friends-20.png" },
  { name: "30-Social Link", min: 30, img: "/assets/badges/friends-30.png" },
  { name: "50-Social Link", min: 50, img: "/assets/badges/friends-50.png" },
  { name: "100-Social Link", min: 100, img: "/assets/badges/friends-100.png" },
  { name: "Booster", min: 10, img: "/assets/badges/booster.png" },
  { name: "Game Master", min: null, img: "/assets/badges/game-master.png" },
];

export default function ClaimBadge({ user, mutate }: { user: any; mutate: () => void }) {
  const wallet = useWallet();
  const [explodingName, setExplodingName] = useState<string | null>(null);

  const handleClaimPreview = (badgeName: string) => {
    if (!wallet.publicKey) return toast.error("CONNECT_WALLET");

    // Trigger Bomb Effect
    setExplodingName(badgeName);

    toast("CLAIMING UPLINK OFFLINE", {
      icon: '💣',
      style: {
        border: '1px solid #eab308',
        padding: '16px',
        color: '#eab308',
        background: '#000',
        fontWeight: 'bold'
      },
    });

    setTimeout(() => {
      toast.success("CLAIMING WILL START SOON - STAY TUNED!", {
        duration: 4000,
        icon: '📡'
      });
      setExplodingName(null);
    }, 800);
  };

  // Logic to sort and calculate stats
  const sortedBadges = useMemo(() => {
    const list = BADGE_LIST.map(badge => {
      const isOwned = user.claimedBadges?.some((cb: any) => cb.badge.name === badge.name);
      let isEligible = false;

      // Eligibility Check Logic
      if (badge.name === "Early Adopter") {
        isEligible = !!user.username && user.laamPoints >= 10000 && user.tagTickets >= 100 &&
          user.hasPaidDiceEntry && user.hasResistanceUnlocked && user.hasPulseHunterUnlocked &&
          user.personalMinted > 0 && user.warriorMinted > 0 &&
          (user.completedQuestsCount || 0) >= 20 && (user.purchasedBoostsCount || 0) > 0;
      } else if (badge.name === "Genesis Staker") {
        isEligible = (user.personalMinted || 0) >= 3;
      } else if (badge.name === "Warrior Claimer") {
        isEligible = (user.warriorMinted || 0) >= 3;
      } else if (badge.name === "Booster") {
        isEligible = (user.purchasedBoostsCount || 0) >= 10;
      } else if (badge.name === "Game Master") {
        isEligible = user.hasPaidDiceEntry && user.hasResistanceUnlocked && user.hasPulseHunterUnlocked;
      } else if (badge.name.includes("-Day Pulse")) {
        isEligible = (user.streakCount || 0) >= (badge.min ?? 0);
      } else if (badge.name.includes("-Quest Master")) {
        isEligible = (user.completedQuestsCount || 0) >= (badge.min ?? 0);
      } else if (badge.name.includes("-Social Link")) {
        isEligible = (user.friendsCount || 0) >= (badge.min ?? 0);
      } else {
        isEligible = (user.laamPoints || 0) >= (badge.min ?? 0);
      }

      return { ...badge, isOwned, isEligible };
    });

    // Sorting: 1st Available (Eligible & Not Owned), 2nd Locked (Not Eligible), 3rd Claimed (Owned)
    return list.sort((a, b) => {
      if (a.isOwned !== b.isOwned) return a.isOwned ? 1 : -1; // Claimed goes to bottom
      if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1; // Available goes to top
      return 0;
    });
  }, [user]);

  const claimedCount = user.claimedBadges?.length || 0;
  const totalBadges = BADGE_LIST.length;

  return (
    <div className={styles.badgeLobby}>
      <h2 className={styles.lobbyTitle}>
        NEURAL BADGE UPLINK: <span style={{ color: '#eab308' }}>{claimedCount}/{totalBadges} COLLECTED</span>
      </h2>

      <div className={styles.badgeGrid}>
        {sortedBadges.map((badge) => (
          <div key={badge.name} className={`${styles.badgeCard} ${(!badge.isEligible && !badge.isOwned) ? styles.locked : ''}`}>
            <img src={badge.img} alt={badge.name} className={styles.badgeImg} />
            <h3 className={styles.badgeName}>{badge.name.toUpperCase()}</h3>

            <button
              onClick={() => handleClaimPreview(badge.name)}
              disabled={!!explodingName || !badge.isEligible || badge.isOwned}
              className={`
                ${badge.isOwned ? styles.btnOwned : badge.isEligible ? styles.btnClaim : styles.btnLocked}
                ${explodingName === badge.name ? styles.bombShake : ''}
              `}
            >
              {badge.isOwned ? "CLAIMED" : explodingName === badge.name ? "BOOM!" : badge.isEligible ? "CLAIM" : "LOCKED"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}