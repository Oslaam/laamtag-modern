import React, { useState, useEffect } from 'react';
import { ShoppingCart, Coins, ShieldAlert, Zap, Target, Lock, Shield } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import styles from '../styles/ArmoryBattleField.module.css';

const SHOP_ITEMS = [
    { id: 'stim_pack', name: 'ADRENALINE STIM', price: 0, description: 'Reduces mission time by 20%', icon: <Zap size={20} /> },
    { id: 'heavy_armor', name: 'CERAMIC PLATING', price: 0, description: 'Increases reward multiplier by 0.2x', icon: <ShieldAlert size={20} /> },
    { id: 'intel_data', name: 'SECTOR INTEL', price: 0, description: 'Reveals high-yield zones', icon: <Target size={20} /> },
];

const ArmoryBattleField = () => {
    const { publicKey } = useWallet();
    const [credits, setCredits] = useState(0);
    const [loading, setLoading] = useState(false);

    // Toggle this to test the "Closed" state
    const [isLocked, setIsLocked] = useState(true);

    useEffect(() => {
        if (publicKey) fetchBalance();
    }, [publicKey]);

    const fetchBalance = async () => {
        try {
            const res = await fetch(`/api/user/credits?address=${publicKey?.toBase58()}`);
            const data = await res.json();
            setCredits(data.balance || 0);
        } catch (e) { console.error("Credit fetch failed"); }
    };

    return (
        <div className={styles.armoryWrapper}>
            {isLocked && (
                <div className={styles.doorOverlay}>
                    <div className={styles.doorLeft}></div>
                    <div className={styles.doorRight}></div>

                    <div className={styles.lockMechanism}>
                        <div className={styles.padlockCircle}>
                            <Lock size={40} className={styles.lockIcon} />
                        </div>
                        <h2 className={styles.lockedTitle}>ARMORY OFFLINE</h2>
                        <p className={styles.lockedSubtitle}>ESTABLISH SECURE LINK TO PROCEED</p>
                        <button
                            className={styles.unlockBtn}
                            onClick={() => setIsLocked(false)}
                        >
                            BYPASS SECURITY
                        </button>
                    </div>
                </div>
            )}

            <div className={`${styles.armoryContainer} ${isLocked ? styles.hiddenContent : ''}`}>
                <div className={styles.armoryHeader}>
                    <div className={styles.creditDisplay}>
                        <Coins size={16} color="#f59e0b" />
                        <span>WAR CREDITS: {credits.toLocaleString()}</span>
                    </div>
                </div>

                <div className={styles.itemGrid}>
                    {SHOP_ITEMS.map((item) => (
                        <div key={item.id} className={styles.itemCard}>
                            <div className={styles.itemIcon}>{item.icon}</div>
                            <h3>{item.name}</h3>
                            <p>{item.description}</p>
                            <button className={styles.buyBtn} disabled>
                                BUY: {item.price} CR
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ArmoryBattleField;