import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getRank } from '../utils/ranks';

export const useRankWatcher = () => {
  const { publicKey } = useWallet();
  const [showRankModal, setShowRankModal] = useState(false);
  const [newRank, setNewRank] = useState<any>(null);
  const [lastKnownRank, setLastKnownRank] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;

    const checkRank = async () => {
      try {

        // Inside checkRank function
        const res = await fetch(`/api/user/${publicKey.toString()}`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.laamPoints !== undefined) {
          const currentRankObj = getRank(data.laamPoints);

          // On first load, just save the rank, don't popup
          if (lastKnownRank === null) {
            setLastKnownRank(currentRankObj.name);
            return;
          }

          // TRIGGER: If rank name changes (e.g. Bronze -> Silver)
          if (currentRankObj.name !== lastKnownRank) {
            setNewRank(currentRankObj);
            setShowRankModal(true);
            setLastKnownRank(currentRankObj.name);
          }
        }
      } catch (e) {
        console.error("Rank watcher error", e);
      }
    };

    // Check immediately, then every 10 seconds
    checkRank();
    const interval = setInterval(checkRank, 10000);

    return () => clearInterval(interval);
  }, [publicKey, lastKnownRank]);

  return { showRankModal, setShowRankModal, newRank };
};