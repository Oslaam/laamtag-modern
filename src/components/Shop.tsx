'use client';

import React from 'react';
import { Ticket, Zap, Loader2, Flame } from 'lucide-react';
import styles from '../styles/Shop.module.css';

export type Pack = {
    amount: number;
    price: number;
    label: string;
    desc: string;
    hot?: boolean;
};

type ShopProps = {
    packs: Pack[];
    loading?: boolean;
    onBuy: (pack: Pack) => void;
};

export default function ShopComponent({ packs, loading = false, onBuy }: ShopProps) {
    return (
        <div className={styles.grid}>
            {packs.map((pack) => (
                <div
                    key={pack.amount}
                    className={`${styles.card} ${pack.hot ? styles.cardHot : ''}`}
                >
                    {pack.hot && (
                        <div className={styles.hotBadge}>
                            <Flame size={9} fill="#a855f7" />
                            BEST VALUE
                        </div>
                    )}

                    <div className={styles.iconWrap}>
                        <Ticket size={26} className={styles.ticketIcon} />
                    </div>

                    <h3 className={styles.packLabel}>{pack.label}</h3>
                    <p className={styles.packDesc}>{pack.desc}</p>

                    <div className={styles.amountBox}>
                        <span className={styles.amountVal}>{pack.amount}</span>
                        <span className={styles.amountUnit}>TICKETS</span>
                    </div>

                    <div className={styles.priceRow}>
                        <span className={styles.priceLabel}>COST</span>
                        <span className={styles.priceVal}>{pack.price} SOL</span>
                    </div>

                    <button
                        disabled={loading}
                        onClick={() => onBuy(pack)}
                        className={`${styles.buyBtn} ${pack.hot ? styles.buyBtnHot : ''} ${loading ? styles.buyBtnDisabled : ''}`}
                    >
                        {loading ? (
                            <Loader2 size={15} className={styles.spinner} />
                        ) : (
                            <>
                                <Zap size={13} fill="currentColor" />
                                REQUISITION
                            </>
                        )}
                    </button>
                </div>
            ))}
        </div>
    );
}