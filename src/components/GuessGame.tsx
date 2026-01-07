import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/router';
import { Target, AlertCircle, Radio, XCircle, Ticket, CheckCircle2, Coins } from 'lucide-react';
import confetti from 'canvas-confetti';

const LEVELS = {
  easy: { range: 20, rewards: [100, 50, 20] },
  normal: { range: 50, rewards: [200, 100, 50] },
  difficult: { range: 100, rewards: [500, 200, 100] }
};

export default function GuessGameComponent() {
  const { publicKey } = useWallet();
  const router = useRouter();

  // Game States
  const [level, setLevel] = useState<'easy' | 'normal' | 'difficult' | null>(null);
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState('Select a level to begin.');
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState<string | null>(null);
  const [revealedNumber, setRevealedNumber] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Economy States
  const [pendingPoints, setPendingPoints] = useState(0);
  const [userTickets, setUserTickets] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const CLAIM_THRESHOLD = 1000;

  // Fetch tickets and existing pending points on load
  useEffect(() => {
    if (!publicKey) return;
    const fetchData = async () => {
      // Fetch User Stats (Tickets)
      const userRes = await fetch(`/api/user/${publicKey.toString()}`);
      const userData = await userRes.json();
      setUserTickets(userData.tagTickets || 0);

      // Fetch existing Game State
      const gameRes = await fetch(`/api/games/guess-game?walletAddress=${publicKey.toString()}`);
      const gameData = await gameRes.json();
      if (gameRes.ok) {
        setPendingPoints(gameData.pendingPoints || 0);
        setIsLocked(gameData.isLocked || false);
        setAttempts(gameData.attempts || 0);
        if (gameData.revealedNumber) setRevealedNumber(gameData.revealedNumber);
      }
    };
    fetchData();
  }, [publicKey, isClaiming]);

  // Lockout Timer Logic
  useEffect(() => {
    if (!isLocked || !publicKey) {
      setLockoutTimer(null);
      return;
    }

    const interval = setInterval(async () => {
      const res = await fetch(`/api/games/guess-game?walletAddress=${publicKey.toString()}`);
      const data = await res.json();

      if (data.lastAttempt) {
        const lastAttemptTime = new Date(data.lastAttempt).getTime();
        const lockoutEnd = lastAttemptTime + (6 * 60 * 60 * 1000); // 6 Hours
        const now = new Date().getTime();
        const diff = lockoutEnd - now;

        if (diff <= 0) {
          setIsLocked(false);
          setLockoutTimer(null);
          clearInterval(interval);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setLockoutTimer(`${hours}h ${minutes}m ${seconds}s`);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked, publicKey]);

  const hasNoTickets = userTickets <= 0;

  const handleClaim = async () => {
    if (!publicKey || pendingPoints < CLAIM_THRESHOLD) return;
    setIsClaiming(true);

    const res = await fetch('/api/games/guess-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: publicKey.toString(),
        action: 'claim'
      })
    });

    if (res.ok) {
      setPendingPoints(0);
      router.reload();
    }
    setIsClaiming(false);
  };

  const startLevel = async (selectedLevel: 'easy' | 'normal' | 'difficult') => {
    if (!publicKey || isLocked || hasNoTickets) return;

    const res = await fetch('/api/games/guess-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: publicKey.toString(),
        action: 'start',
        level: selectedLevel
      })
    });

    if (res.ok) {
      setLevel(selectedLevel);
      setAttempts(0);
      setRevealedNumber(null);
      setIsSuccess(false);
      setUserTickets(prev => prev - 1);
      setMessage(`Frequency Range: 1-${LEVELS[selectedLevel].range}. Find the signal...`);
    } else {
      const data = await res.json();
      setMessage(data.message || "Failed to start level.");
    }
  };

  const handleGuess = async () => {
    if (!publicKey || !level || isLocked) return;

    const res = await fetch('/api/games/guess-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: publicKey.toString(),
        level,
        userGuess: guess
      })
    });

    const data = await res.json();

    if (data.win) {
      setIsSuccess(true);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#EAB308', '#A855F7', '#FFFFFF']
      });
      setPendingPoints(data.pendingPoints);
      setTimeout(() => {
        setIsSuccess(false);
        setLevel(null);
      }, 3000);
    } else {
      setAttempts(data.attempts);
      setMessage(data.message);
      if (data.isLocked) {
        setIsLocked(true);
        setRevealedNumber(data.revealedNumber);
      }
    }
    setGuess('');
  };

  return (
    <div className={`relative transition-all duration-500 ${isSuccess ? 'scale-105' : ''}`}>
      {/* SUCCESS OVERLAY */}
      {isSuccess && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-purple-600/20 backdrop-blur-md animate-in fade-in duration-500">
          <div className="text-center animate-bounce">
            <CheckCircle2 size={100} className="text-yellow-500 mx-auto drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
            <h2 className="text-5xl font-black italic text-white uppercase mt-4 tracking-tighter">Frequency Jammed!</h2>
            <p className="text-yellow-500 font-black text-2xl mt-2">+{pendingPoints} LAAM PENDING</p>
          </div>
        </div>
      )}

      {/* CLAIM SECTION */}
      {!level && pendingPoints > 0 && (
        <div className="max-w-2xl mx-auto mb-6 p-6 bg-purple-900/20 border border-purple-500/30 rounded-[32px] backdrop-blur-sm">
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Coins size={14} className="text-purple-400" />
                <p className="text-[10px] text-purple-400 font-black uppercase tracking-[0.2em]">Pending Rewards</p>
              </div>
              <p className="text-3xl font-black text-white leading-none">{pendingPoints} <span className="text-yellow-500 text-xs">LAAM</span></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-bold uppercase">Threshold</p>
              <p className="text-sm font-black text-gray-400">{pendingPoints}/{CLAIM_THRESHOLD}</p>
            </div>
          </div>

          <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-1000"
              style={{ width: `${Math.min((pendingPoints / CLAIM_THRESHOLD) * 100, 100)}%` }}
            />
          </div>

          <button
            onClick={handleClaim}
            disabled={pendingPoints < CLAIM_THRESHOLD || isClaiming}
            className={`relative w-full py-4 rounded-2xl font-black uppercase transition-all overflow-hidden group ${pendingPoints >= CLAIM_THRESHOLD
              ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:scale-[1.02]'
              : 'bg-gray-800/50 text-gray-500 cursor-not-allowed opacity-50'
              }`}
          >
            {pendingPoints >= CLAIM_THRESHOLD && (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite] group-hover:duration-500" />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              {pendingPoints >= CLAIM_THRESHOLD ? "Claim All Rewards" : `Collect ${CLAIM_THRESHOLD - pendingPoints} more LAAM to Claim`}
            </span>
          </button>
        </div>
      )}

      {/* Main Game UI */}
      <div className={`bg-gray-900/50 border rounded-[32px] p-8 max-w-2xl mx-auto transition-all ${isSuccess ? 'border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)]' : 'border-yellow-500/30'}`}>
        {level && (
          <div className="space-y-6">
            <div className="bg-black/50 p-4 rounded-xl border border-white/5 text-center">
              <p className="text-yellow-500 font-mono text-sm uppercase">{message}</p>
            </div>
            <div className="flex gap-4">
              <input
                type="number"
                value={guess}
                disabled={isLocked || hasNoTickets || isSuccess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 font-bold text-xl text-yellow-500 outline-none"
                placeholder="000"
              />

              <button
                onClick={hasNoTickets ? () => router.push('/shop') : handleGuess}
                disabled={isSuccess || isLocked}
                className={`px-8 rounded-xl font-black uppercase transition-all ${hasNoTickets
                  ? 'bg-purple-600 text-white animate-pulse'
                  : 'bg-yellow-500 text-black'
                  } ${isSuccess ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {hasNoTickets ? "Get Tickets" : "Guess"}
              </button>
            </div>
            <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase">
              <div className="flex gap-2">
                {[1, 2, 3].map(s => <div key={s} className={`w-3 h-3 rounded-full ${attempts >= s ? 'bg-red-500 shadow-[0_0_5px_red]' : 'bg-gray-800'}`} />)}
              </div>
              <span>Attempts {attempts}/3</span>
            </div>
          </div>
        )}

        {!level && !isLocked && (
          <div className="grid grid-cols-3 gap-4">
            {(['easy', 'normal', 'difficult'] as const).map(l => (
              <button
                key={l}
                onClick={() => startLevel(l)}
                className="group relative bg-black border border-white/10 p-4 rounded-2xl hover:border-yellow-500 transition-all flex flex-col items-center justify-center overflow-hidden"
              >
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 rounded-md group-hover:bg-purple-500/40 transition-colors">
                  <Ticket size={8} className="text-purple-400" />
                  <span className="text-[7px] font-black text-purple-400 uppercase">-1</span>
                </div>
                <p className="text-yellow-500 font-black text-[10px] uppercase mb-1">{l}</p>
                <p className="text-white font-bold text-lg tracking-tighter leading-none">1-{LEVELS[l].range}</p>
                <p className="text-[7px] text-gray-500 font-bold uppercase mt-2 tracking-widest">Up to {LEVELS[l].rewards[0]} LAAM</p>
              </button>
            ))}
          </div>
        )}

        {isLocked && !level && (
          <div className="text-center py-8 bg-red-950/20 border border-red-500/30 rounded-2xl animate-pulse">
            <XCircle className="text-red-500 mx-auto mb-3" size={48} />
            <h3 className="text-red-500 font-black text-2xl italic uppercase tracking-tighter">System Overheated</h3>
            <p className="text-gray-400 text-xs font-bold uppercase mb-4">Frequency Jammer Cooling Down</p>

            <div className="inline-block bg-black px-6 py-2 rounded-full border border-red-500/50">
              <span className="text-red-500 font-mono text-xl font-bold">{lockoutTimer || "00:00:00"}</span>
            </div>

            {revealedNumber && (
              <p className="text-gray-500 text-[10px] mt-4 uppercase">
                Last target was: <span className="text-white">{revealedNumber}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}