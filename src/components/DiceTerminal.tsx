import React, { useState } from 'react';
import { Lock, Unlock, Cpu } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import bs58 from 'bs58';

interface DiceTerminalProps {
    user: {
        walletAddress: string;
        tagTickets: number;
        hasPaidDiceEntry: boolean;
        activities?: any[];
    };
    refreshUser: () => void;
}

const DiceTerminal: React.FC<DiceTerminalProps> = ({ user, refreshUser }) => {
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [winChance, setWinChance] = useState(45);
    const [isRolling, setIsRolling] = useState(false);
    const [rollResult, setRollResult] = useState<number | null>(null);
    const [lastResultWasWin, setLastResultWasWin] = useState<boolean | null>(null);

    const multiplier = parseFloat((99 / winChance).toFixed(4));
    const { publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();

    if (!user || !user.walletAddress) {
        return (
            <div className="terminal-card" style={{ padding: '60px', textAlign: 'center' }}>
                <Cpu className="animate-spin" size={40} color="#eab308" />
                <p style={{ marginTop: '10px' }}>INITIALIZING DATA...</p>
            </div>
        );
    }

    const handleUnlock = async () => {
        if (!publicKey) {
            toast.error("Connect Wallet First");
            return;
        }

        setIsDecrypting(true);
        try {
            const SKR_MINT = new PublicKey("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");
            const TREASURY = new PublicKey("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc");

            const userAta = await getAssociatedTokenAddress(SKR_MINT, publicKey);
            const treasuryAta = await getAssociatedTokenAddress(SKR_MINT, TREASURY);

            const { blockhash } = await connection.getLatestBlockhash('confirmed');

            const instructions = [
                createTransferInstruction(
                    userAta,
                    treasuryAta,
                    publicKey,
                    200 * Math.pow(10, 6)
                )
            ];

            const messageV0 = new TransactionMessage({
                payerKey: publicKey,
                recentBlockhash: blockhash,
                instructions,
            }).compileToV0Message();

            const transaction = new VersionedTransaction(messageV0);

            // 4. Send Transaction
            const signatureResult = await sendTransaction(transaction, connection);

            // CLEAN SIGNATURE LOGIC: Ensures Seeker objects are converted to strings
            const signature = typeof signatureResult === 'string'
                ? signatureResult
                : bs58.encode(new Uint8Array(Object.values(signatureResult)));

            toast.loading("Verifying on-chain...", { id: "verify-tx" });

            // 5. Notify Backend (Minting Pattern)
            const res = await fetch('/api/games/dice/unlock-dice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: publicKey.toBase58(),
                    signature: signature
                })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("DICE MODULE UNLOCKED", { id: "verify-tx" });
                await refreshUser();
                setIsDecrypting(false);
            } else {
                throw new Error(data.error || "Verification failed");
            }
        } catch (err: any) {
            console.error("Unlock error:", err);
            toast.error(err.message || "Payment Failed", { id: "verify-tx" });
            setIsDecrypting(false);
        }
    };

    const handleRoll = async () => {
        if (isRolling) return;
        if (user.tagTickets < 50) {
            toast.error("INSUFFICIENT TAG BALANCE");
            return;
        }
        setIsRolling(true);
        setRollResult(null);
        setLastResultWasWin(null);

        try {
            const res = await fetch('/api/games/dice/roll-dice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: user.walletAddress, winChance })
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Roll failed");
                setIsRolling(false);
                return;
            }

            setRollResult(data.rollResult);
            setLastResultWasWin(data.isWin);
            setIsRolling(false);
            refreshUser();

            if (data.isWin) {
                toast.success(`CRITICAL HIT: +${data.reward} $SKR`);
            } else {
                toast.error("SIGNAL LOST: -50 TAG");
            }
        } catch (err) {
            toast.error("Network Error");
            setIsRolling(false);
        }
    };

    if (!user.hasPaidDiceEntry && !isDecrypting) {
        return (
            <div className="terminal-card" style={{ padding: '60px 20px', textAlign: 'center', border: '1px solid #eab308' }}>
                <Lock size={50} color="#eab308" style={{ marginBottom: '20px', marginInline: 'auto' }} />
                <h2 style={{ color: '#fff' }}>DICE MODULE ENCRYPTED</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '20px 0' }}>
                    Access requires a one-time decryption fee of 200 $SKR.
                </p>
                <button onClick={handleUnlock} className="terminal-button" style={{ background: '#eab308', color: '#000', padding: '12px 30px', fontWeight: 900, cursor: 'pointer' }}>
                    UNLOCK (200 $SKR)
                </button>
            </div>
        );
    }

    if (isDecrypting) return (
        <div className="terminal-card" style={{ padding: '80px 20px', textAlign: 'center' }}>
            <Cpu className="animate-spin" size={50} color="#eab308" style={{ marginBottom: '20px', marginInline: 'auto' }} />
            <h2 className="terminal-text-glow">ESTABLISHING CONNECTION...</h2>
        </div>
    );

    return (
        <div className="terminal-card" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ color: '#eab308', margin: 0 }}><Unlock size={16} /> PROBABILITY MATRIX</h3>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>BALANCE: {user.tagTickets} TAG</span>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <input
                    type="range"
                    min="2"
                    max="90"
                    step="0.1"
                    value={winChance}
                    onChange={(e) => setWinChance(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#eab308' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '12px' }}>
                    <span>CHANCE: {winChance}%</span>
                    <span>MULT: {multiplier}x</span>
                </div>
            </div>

            <div style={{ background: 'rgba(234,179,8,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', border: '1px dashed #eab308' }}>
                <p style={{ fontSize: '10px', color: '#eab308', margin: 0 }}>MAX POTENTIAL RECOVERY</p>
                <span style={{ fontSize: '24px', fontWeight: 900 }}>8000 $SKR</span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Cpu size={12} color="#eab308" />
                    <span style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px' }}>PROVABLY FAIR SYSTEM</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>CLIENT SEED:</span>
                    <span style={{ color: '#fff', fontFamily: 'monospace' }}>{user?.walletAddress?.slice(0, 4)}...{user?.walletAddress?.slice(-4)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginTop: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>CURRENT NONCE:</span>
                    <span style={{ color: '#eab308', fontWeight: 900 }}>{user.activities?.length || 0}</span>
                </div>
            </div>

            <button onClick={handleRoll} disabled={isRolling} style={{ width: '100%', padding: '18px', background: isRolling ? '#333' : '#eab308', color: '#000', fontWeight: 900, border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                {isRolling ? "CALCULATING..." : "DEPLOY 50 TAG"}
            </button>

            {rollResult !== null && lastResultWasWin !== null && (
                <div style={{
                    marginTop: '20px',
                    textAlign: 'center',
                    padding: '20px',
                    borderRadius: '12px',
                    background: 'rgba(0,0,0,0.5)',
                    border: `1px solid ${lastResultWasWin ? '#22c55e' : '#ef4444'}`
                }}>
                    <h1 style={{ color: lastResultWasWin ? '#22c55e' : '#ef4444', fontSize: '48px', margin: 0 }}>
                        {rollResult}
                    </h1>
                    <p style={{ fontWeight: 900, color: lastResultWasWin ? '#22c55e' : '#ef4444' }}>
                        {lastResultWasWin ? "SUCCESS" : "FAILED"}
                    </p>
                </div>
            )}
        </div>
    );
};

export default DiceTerminal;