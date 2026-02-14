import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import { useLaamProgram } from '../hooks/use-laam-program';
import styles from '../styles/DomainRegister.module.css';

export const DomainRegister = () => {
    const { publicKey } = useWallet();
    const { registerName, getPrice } = useLaamProgram();
    const [name, setName] = useState('');
    const [years, setYears] = useState(1);
    const [loading, setLoading] = useState(false);

    // --- FEATURE FLAG / LOCK ---
    // Set this to 'false' when you are ready to go live!
    const isLocked = true;

    const handleRegister = async () => {
        if (isLocked) return; // Safety check
        if (!publicKey) return toast.error("Connect your wallet first!");
        if (!name || name.length < 3) return toast.error("Name must be at least 3 characters.");

        setLoading(true);
        const toastId = toast.loading("Processing Registration...");

        try {
            const signature = await registerName(name, years);
            toast.success("Domain Secured!", { id: toastId });
            setName('');
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Registration Failed", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Secure your <span className={styles.highlight}>Identity</span></h2>

            <div className={styles.terminalCard}>
                <div className={styles.inputGroup}>
                    <div className={styles.inputWrapper}>
                        <input
                            type="text"
                            placeholder={isLocked ? "REGISTRATION LOCKED" : "search-name"}
                            value={name}
                            onChange={(e) => setName(e.target.value.toLowerCase())}
                            className={styles.input}
                            disabled={isLocked} // Disable input too
                        />
                        <span className={styles.suffix}>.laam</span>
                    </div>

                    <select
                        value={years}
                        onChange={(e) => setYears(Number(e.target.value))}
                        className={styles.select}
                        disabled={isLocked}
                    >
                        <option value={1}>1 Year</option>
                    </select>
                </div>
                <div>
                    <span className={styles.feeLabel}>-70% for NFT HOLDERS</span>
                </div>

                <div className={styles.priceRow}>
                    <span className={styles.feeLabel}>Status</span>
                    <span className={styles.feeValue} style={{ color: isLocked ? '#ef4444' : '#eab308' }}>
                        {isLocked ? "MAINTENANCE MODE" : `${getPrice(name.length, years)} SOL`}
                    </span>
                </div>

                <button
                    onClick={handleRegister}
                    disabled={loading || isLocked || !name}
                    className={styles.registerBtn}
                    style={{
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        filter: isLocked ? 'grayscale(1) opacity(0.5)' : 'none'
                    }}
                >
                    {isLocked ? "LOCKED BY SYSTEM_ADMIN" : (loading ? "TRANSACTING..." : "REGISTER DOMAIN")}
                </button>
            </div>
        </div>
    );
};