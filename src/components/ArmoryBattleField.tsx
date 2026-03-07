'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Coins, Lock, Swords, Dog, Shirt, PackageCheck, Cpu, Radio, RefreshCcw } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import armoryData from '../lib/armory.json';
import styles from '../styles/ArmoryBattleField.module.css';

type Category = 'WEAPON' | 'PET' | 'GARMENT' | 'DRONE' | 'CYBERNETIC';

const ArmoryBattleField = () => {
    const { publicKey } = useWallet();
    const [warCredits, setWarCredits] = useState(0);
    const [activeTab, setActiveTab] = useState<Category>('WEAPON');
    const [ownedWarriorItemIds, setOwnedWarriorItemIds] = useState<string[]>([]);
    const [isLocked, setIsLocked] = useState(true);
    const [loading, setLoading] = useState(false);

    const itemQuantities = useMemo(() => {
        return ownedWarriorItemIds.reduce((acc: Record<string, number>, id) => {
            acc[id] = (acc[id] || 0) + 1;
            return acc;
        }, {});
    }, [ownedWarriorItemIds]);

    const uniqueOwnedItems = useMemo(() => {
        const allItems = Object.values(armoryData).flat();
        const uniqueIds = Array.from(new Set(ownedWarriorItemIds));
        return uniqueIds.map(id => allItems.find(item => item.id === id)).filter(Boolean);
    }, [ownedWarriorItemIds]);

    useEffect(() => {
        if (publicKey) fetchWarriorData();
    }, [publicKey]);

    const fetchWarriorData = async () => {
        try {
            const res = await fetch(`/api/warrior-armory/status?address=${publicKey?.toBase58()}`);
            const data = await res.json();
            setWarCredits(data.balance || 0);
            setOwnedWarriorItemIds(data.ownedItemIds || []);
        } catch (e) { console.error("Armory link failed"); }
    };

    const handleWarriorPurchase = async (item: any) => {
        if (warCredits < item.cost) return alert("INSUFFICIENT WAR CREDITS");
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1200));

        try {
            const res = await fetch('/api/warrior-armory/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: item.id,
                    address: publicKey?.toBase58(),
                    cost: item.cost,
                    category: activeTab,
                    itemName: item.name
                })
            });

            if (res.ok) {
                setOwnedWarriorItemIds(prev => [...prev, item.id]);
                setWarCredits(prev => prev - item.cost);
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (e) {
            console.error("Purchase sync error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.armoryWrapper}>
            <div className={`${styles.armoryContainer} ${isLocked ? styles.hiddenContent : ''}`}>
                <div className={styles.armoryHeader}>
                    <div className={styles.tabs}>
                        <button onClick={() => setActiveTab('WEAPON')} className={activeTab === 'WEAPON' ? styles.activeTab : ''}><Swords size={16} /> WEAPONS</button>
                        <button onClick={() => setActiveTab('PET')} className={activeTab === 'PET' ? styles.activeTab : ''}><Dog size={16} /> PETS</button>
                        <button onClick={() => setActiveTab('GARMENT')} className={activeTab === 'GARMENT' ? styles.activeTab : ''}><Shirt size={16} /> GEAR</button>
                        <button onClick={() => setActiveTab('DRONE')} className={activeTab === 'DRONE' ? styles.activeTab : ''}><Radio size={16} /> DRONES</button>
                        <button onClick={() => setActiveTab('CYBERNETIC')} className={activeTab === 'CYBERNETIC' ? styles.activeTab : ''}><Cpu size={16} /> AUGMENTS</button>
                    </div>
                    <div className={styles.creditDisplay}>
                        <Coins size={16} />
                        <span>{warCredits.toLocaleString()} CR</span>
                    </div>
                </div>

                <div className={styles.itemGrid}>
                    {armoryData[activeTab]?.map((item: any) => (
                        <div key={item.id} className={styles.itemCard}>
                            <div className={styles.imageWrapper}>
                                <img src={item.image} alt={item.name} />
                                <div className={styles.descriptionOverlay}>
                                    <p>{item.description}</p>
                                </div>
                            </div>
                            <div className={styles.itemInfo}>
                                <h3>{item.name}</h3>
                                <button
                                    className={styles.buyBtn}
                                    disabled={loading}
                                    onClick={() => handleWarriorPurchase(item)}
                                >
                                    {loading ? <RefreshCcw className={styles.spinIcon} size={14} /> : `BUY ${item.cost}`}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.warriorLocker}>
                    <h2 className={styles.lockerTitle}><PackageCheck size={20} /> WARDROBE</h2>
                    <div className={styles.lockerGrid}>
                        {uniqueOwnedItems.length === 0 ? (
                            <div className={styles.emptyLocker}>NO ASSETS ACQUIRED</div>
                        ) : (
                            uniqueOwnedItems.map((item: any) => (
                                <div key={item.id} className={styles.lockerItem}>
                                    <div className={styles.lockerImageWrap}>
                                        <img src={item.image} alt={item.name} className={styles.lockerThumb} />
                                        <span className={styles.quantityBadge}>{itemQuantities[item.id]}</span>
                                    </div>
                                    <p className={styles.lockerItemName}>{item.name}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArmoryBattleField;