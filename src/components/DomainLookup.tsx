import React, { useState } from 'react';
import { useLaamProgram } from '../hooks/use-laam-program';
import styles from '../styles/DomainRegister.module.css';

export const DomainLookup = () => {
    const [searchName, setSearchName] = useState('');
    const [owner, setOwner] = useState<string | null>(null);
    const [searching, setSearching] = useState(false);
    const { resolveName } = useLaamProgram();

    const handleSearch = async () => {
        if (!searchName) return;
        setSearching(true);
        try {
            const result = await resolveName(searchName);
            if (result) {
                setOwner(result.toBase58());
            } else {
                setOwner("Identity Available for Registration");
            }
        } catch (err) {
            setOwner("Error fetching directory data");
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className={styles.lookupContainer}>
            <span className={styles.lookupLabel}>Search Directory</span>
            <div className={styles.inputGroup}>
                <div className={styles.inputWrapper}>
                    <input
                        type="text"
                        placeholder="search-identity-name"
                        className={styles.input}
                        onChange={(e) => setSearchName(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={searching}
                    className={styles.registerBtn}
                    style={{ flex: '0 0 auto', width: 'auto', paddingLeft: '2rem', paddingRight: '2rem' }}
                >
                    {searching ? 'QUERYING...' : 'Lookup'}
                </button>
            </div>

            {owner && (
                <div className={styles.resultBox}>
                    <p className={styles.resultHeader}>System Result</p>
                    <p className={`${styles.resultValue} ${owner.includes("Available") ? styles.available : ""}`}>
                        {owner}
                    </p>
                </div>
            )}
        </div>
    );
};