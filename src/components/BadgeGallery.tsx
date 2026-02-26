// import React from 'react';
// import ClaimBadge from './ClaimBadge';
// import { BADGE_MAP } from '../utils/badge-map';
// import styles from '../styles/BadgeGallery.module.css';

// // Order must match your getRank utility
// const RANK_ORDER = [
//     "Bronze", "Bronze Elite", "Silver", "Silver Elite",
//     "Gold", "Gold Elite", "Platinum", "Diamond",
//     "Legend", "Mythic", "Eternal", "Ascendant"
// ];

// interface BadgeGalleryProps {
//     userRank: string; // The rank string from your User database
// }

// export default function BadgeGallery({ userRank }: BadgeGalleryProps) {
//     const userRankIndex = RANK_ORDER.indexOf(userRank);

//     return (
//         <div className={styles.grid}>
//             {RANK_ORDER.map((rankName, index) => {
//                 const isLocked = userRankIndex < index;

//                 return (
//                     <div
//                         key={rankName}
//                         className={`${styles.badgeCard} ${isLocked ? styles.locked : styles.unlocked}`}
//                     >
//                         <h3>{rankName}</h3>
//                         {/* Placeholder for Badge Image */}
//                         <div className={styles.badgeImagePlaceholder}>
//                             {/* <img src={`/badges/${rankName.replace(' ', '_')}.png`} /> */}
//                         </div>

//                         <ClaimBadge
//                             rankToMint={rankName}
//                             userActualRank={userRank}
//                             isLocked={isLocked}
//                         />
//                     </div>
//                 );
//             })}
//         </div>
//     );
// }