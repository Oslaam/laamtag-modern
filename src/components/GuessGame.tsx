'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Ticket } from 'lucide-react';
import confetti from 'canvas-confetti';
import styles from '../styles/GuessGame.module.css';

const LEVELS = {
  easy: { range: 20, rewards: [1000, 500, 200] },
  normal: { range: 50, rewards: [2000, 1000, 500] },
  difficult: { range: 100, rewards: [5000, 2000, 1000] }
};

export default function GuessGameComponent() {
  const { publicKey } = useWallet();
  const router = useRouter();

  const [level, setLevel] = useState<'easy' | 'normal' | 'difficult' | null>(null);
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState('INITIATE SIGNAL SCAN...');
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState<string | null>(null);
  const [revealedNumber, setRevealedNumber] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastAttemptTimestamp, setLastAttemptTimestamp] = useState<number | null>(null);

  const [pendingPoints, setPendingPoints] = useState(0);
  const [userTickets, setUserTickets] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [mounted, setMounted] = useState(false);

  const CLAIM_THRESHOLD = 1000;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!publicKey || !mounted) return;
    const fetchData = async () => {
      try {
        const userRes = await fetch(`/api/user/${publicKey.toString()}`);
        const userData = await userRes.json();
        setUserTickets(userData.tagTickets || 0);

        const gameRes = await fetch(`/api/games/guess-game?walletAddress=${publicKey.toString()}`);
        const gameData = await gameRes.json();
        if (gameRes.ok) {
          setPendingPoints(gameData.pendingPoints || 0);
          setAttempts(gameData.attempts || 0);
          if (gameData.revealedNumber) setRevealedNumber(gameData.revealedNumber);

          if (gameData.lastAttempt) {
            const timestamp = new Date(gameData.lastAttempt).getTime();
            setLastAttemptTimestamp(timestamp);
            const lockoutEnd = timestamp + (1 * 60 * 60 * 1000);
            setIsLocked(Date.now() < lockoutEnd);
          }
        }
      } catch (e) {
        console.error("Fetch error:", e);
      }
    };
    fetchData();
  }, [publicKey, isClaiming, mounted]);

  useEffect(() => {
    if (!isLocked || !lastAttemptTimestamp) return;

    const interval = setInterval(() => {
      const lockoutEnd = lastAttemptTimestamp + (1 * 60 * 60 * 1000);
      const diff = lockoutEnd - Date.now();

      if (diff <= 0) {
        setIsLocked(false);
        setLockoutTimer(null);
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setLockoutTimer(`${hours}H ${minutes}M ${seconds}S`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked, lastAttemptTimestamp]);

  const handleClaim = async () => {
    if (!publicKey || pendingPoints < CLAIM_THRESHOLD) return;
    setIsClaiming(true);
    const res = await fetch('/api/games/guess-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: publicKey.toString(), action: 'claim' })
    });
    if (res.ok) {
      setPendingPoints(0);
      window.location.reload();
    }
    setIsClaiming(false);
  };

  const startLevel = async (selectedLevel: 'easy' | 'normal' | 'difficult') => {
    if (!publicKey || isLocked || userTickets <= 0) return;
    const res = await fetch('/api/games/guess-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: publicKey.toString(), action: 'start', level: selectedLevel })
    });
    if (res.ok) {
      setLevel(selectedLevel);
      setAttempts(0);
      setRevealedNumber(null);
      setIsSuccess(false);
      setUserTickets(prev => prev - 1);
      setMessage(`FREQ RANGE: 1-${LEVELS[selectedLevel].range}. FIND SIGNAL...`);
    }
  };

  const handleGuess = async () => {
    if (!publicKey || !level || isLocked || !guess) return;
    try {
      const res = await fetch('/api/games/guess-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toString(), level, userGuess: guess })
      });
      const data = await res.json();

      if (data.win) {
        setIsSuccess(true);
        setRevealedNumber(data.revealedNumber);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#EAB308', '#FFFFFF', '#000000']
        });
        setPendingPoints(data.pendingPoints);
        setTimeout(() => {
          setIsSuccess(false);
          setLevel(null);
          setRevealedNumber(null);
        }, 3000);
      } else {
        setAttempts(data.attempts);
        setMessage((data.message || "SIGNAL LOST").toUpperCase());
        if (data.isLocked) {
          setIsLocked(true);
          setLastAttemptTimestamp(Date.now());
          setRevealedNumber(data.revealedNumber);
        }
      }
      setGuess('');
    } catch (e) {
      setMessage("COMMUNICATION ERROR");
    }
  };

  if (!mounted || !publicKey) return null;

  return (
    <div className={styles.container}>

      {/* SUCCESS OVERLAY */}
      {isSuccess && (
        <div className={styles.overlay}>
          <div>
            <CheckCircle2 size={80} style={{ color: '#eab308', margin: '0 auto' }} />
            <h2 className={styles.successTitle}>Signal Locked</h2>
            <p style={{ color: '#eab308', fontWeight: 900, fontSize: '20px' }}>+{pendingPoints} LAAM SECURED</p>
          </div>
        </div>
      )}

      {/* REWARD PROGRESS BAR */}
      {!level && pendingPoints > 0 && (
        <div className={styles.rewardCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '8px', color: '#eab308', fontWeight: 900, textTransform: 'uppercase' }}>Pending Extraction</p>
              <p style={{ fontSize: '24px', fontWeight: 900, color: '#fff', margin: 0 }}>{pendingPoints} <span style={{ fontSize: '10px' }}>LAAM</span></p>
            </div>
            <p style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.3)' }}>{pendingPoints} / {CLAIM_THRESHOLD}</p>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min((pendingPoints / CLAIM_THRESHOLD) * 100, 100)}%` }}
            />
          </div>
          <button
            onClick={handleClaim}
            disabled={pendingPoints < CLAIM_THRESHOLD || isClaiming}
            className={styles.terminalButton}
            style={{
              width: '100%',
              background: pendingPoints >= CLAIM_THRESHOLD ? '#eab308' : 'rgba(255,255,255,0.05)',
              color: pendingPoints >= CLAIM_THRESHOLD ? '#000' : 'rgba(255,255,255,0.2)'
            }}
          >
            {isClaiming ? "EXTRACTING..." : pendingPoints >= CLAIM_THRESHOLD ? "CLAIM REWARDS" : `NEED ${CLAIM_THRESHOLD - pendingPoints} MORE LAAM`}
          </button>
        </div>
      )}

      {/* MAIN GAME INTERFACE */}
      <div className={styles.terminalCard}>
        {level ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className={styles.messageBox}>
              <p className={styles.messageText}>{message}</p>
            </div>

            <div className={styles.inputGroup}>
              <input
                type="number"
                value={guess}
                disabled={isLocked || isSuccess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
                className={styles.guessInput}
                placeholder="000"
              />
              <button
                onClick={userTickets <= 0 ? () => router.push('/shop') : handleGuess}
                disabled={isSuccess || isLocked}
                className={styles.terminalButton}
                style={{ background: '#eab308', color: '#000', padding: '0 24px' }}
              >
                {userTickets <= 0 ? "GET TICKET" : "SEND"}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3].map(s => (
                  <div key={s} style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: attempts >= s ? '#ef4444' : '#111',
                    boxShadow: attempts >= s ? '0 0 10px #ef4444' : 'none',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }} />
                ))}
              </div>
              <p style={{ fontSize: '8px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Attempts {attempts}/3</p>
            </div>
          </div>
        ) : !isLocked ? (
          <div className={styles.levelGrid}>
            {(['easy', 'normal', 'difficult'] as const).map(l => (
              <button key={l} onClick={() => startLevel(l)} className={styles.levelButton}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                  <Ticket size={10} style={{ color: '#eab308' }} />
                  <span style={{ fontSize: '8px', fontWeight: 900, color: '#eab308' }}>-1</span>
                </div>
                <p style={{ fontSize: '9px', fontWeight: 900, color: '#fff', textTransform: 'uppercase', marginBottom: '4px' }}>{l}</p>
                <p style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>1-{LEVELS[l].range}</p>
                <p style={{ fontSize: '7px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>UP TO {LEVELS[l].rewards[0]} LAAM</p>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <XCircle style={{ color: '#ef4444', margin: '0 auto 16px' }} size={48} />
            <h3 style={{ color: '#ef4444', fontWeight: 900, fontSize: '20px', textTransform: 'uppercase', fontStyle: 'italic' }}>System Lockout</h3>
            <div style={{ background: '#000', border: '1px solid #ef4444', padding: '10px 20px', borderRadius: '50px', display: 'inline-block', margin: '16px 0' }}>
              <span style={{ color: '#ef4444', fontFamily: 'monospace', fontWeight: 900, fontSize: '18px' }}>{lockoutTimer || "00:00:00"}</span>
            </div>
            {revealedNumber && <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Intercepted Frequency: <span style={{ color: '#fff' }}>{revealedNumber}</span></p>}
          </div>
        )}
      </div>
    </div>
  );
}