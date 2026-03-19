import React from 'react';
import ClaimBadge from './ClaimBadge';
import styles from '../styles/BadgeGallery.module.css';

export default function BadgeGallery({ user, mutate }: { user: any; mutate: () => void }) {
    const ownedCount = user.claimedBadges?.length || 0;

    return (
        <section className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h2>NEURAL BADGE REPOSITORY</h2>
                    <p>SYNCED UPLINKS: <span className={styles.highlight}>{ownedCount} / 28</span></p>
                </div>
            </header>

            <ClaimBadge user={user} mutate={mutate} />
        </section>

    );

} 