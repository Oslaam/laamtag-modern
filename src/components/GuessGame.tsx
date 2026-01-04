import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Target, AlertCircle, Radio, XCircle } from 'lucide-react';

const LEVELS = {
  easy: { range: 20, rewards: [100, 50, 20] },
  normal: { range: 50, rewards: [200, 100, 50] },
  difficult: { range: 100, rewards: [500, 200, 100] }
};

export default function GuessGameComponent() {
  const { publicKey } = useWallet();
  const [level, setLevel] = useState<'easy' | 'normal' | 'difficult' | null>(null);
  const [target, setTarget] = useState(0);
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState('Select a level to begin.');
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState("");
  const [pendingPoints, setPendingPoints] = useState(0);
  const [revealedNumber, setRevealedNumber] = useState<number | null>(null); // NEW

  // ... (Keep your existing lockout timer and status check useEffects)

  const startLevel = (selectedLevel: 'easy' | 'normal' | 'difficult') => {
    if (isLocked) return;
    const range = LEVELS[selectedLevel].range;
    setTarget(Math.floor(Math.random() * range) + 1);
    setLevel(selectedLevel);
    setAttempts(0);
    setRevealedNumber(null);
    setMessage(`I'm thinking of a number between 1 and ${range}...`);
  };

  const handleGuess = async () => {
    if (!publicKey || !level || isLocked) return;
    const currentAttempt = attempts + 1;
    const numGuess = parseInt(guess);

    const res = await fetch('/api/quests/guess-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            walletAddress: publicKey.toString(), 
            level, 
            userGuess: guess, 
            attemptCount: currentAttempt, 
            targetNumber: target 
        })
    });
    const data = await res.json();

    if (data.win) {
      setMessage(data.message);
      setPendingPoints(data.pendingPoints);
      setLevel(null);
    } else {
      setAttempts(currentAttempt);
      if (data.isLocked) {
        setIsLocked(true);
        setRevealedNumber(data.revealedNumber); // Capture from API
        setMessage("SYSTEM LOCKED");
      } else {
        const hint = numGuess < target ? "HIGHER" : "LOWER";
        setMessage(`INCORRECT. Frequency is ${hint} than ${numGuess}.`);
      }
    }
    setGuess('');
  };

  return (
    <div className="relative">
      {/* GAME OVER MODAL */}
      {isLocked && revealedNumber && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border-2 border-red-500 rounded-[40px] p-10 max-w-sm w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.3)]">
            <XCircle size={64} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-3xl font-black text-white italic uppercase italic">Access Denied</h3>
            <div className="my-6 bg-red-500/10 py-4 rounded-2xl border border-red-500/20">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Correct Frequency Was</p>
              <p className="text-5xl font-black text-red-500">{revealedNumber}</p>
            </div>
            <p className="text-gray-400 text-sm mb-6 uppercase font-bold">Manual override available in:<br/><span className="text-white text-xl">{lockoutTimer}</span></p>
            <button 
              onClick={() => { setRevealedNumber(null); setLevel(null); }}
              className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 transition-all uppercase"
            >
              Return to Hub
            </button>
          </div>
        </div>
      )}

      {/* Main Game UI */}
      <div className="bg-gray-900/50 border border-yellow-500/30 rounded-[32px] p-8 max-w-2xl mx-auto">
        {/* ... (Keep your existing Header and Claim Button logic) */}
        
        {/* Simplified guess input section with Reveal logic */}
        {level && (
          <div className="space-y-6">
            <div className="bg-black/50 p-4 rounded-xl border border-white/5 text-center">
              <p className="text-yellow-500 font-mono text-sm uppercase">{message}</p>
            </div>
            <div className="flex gap-4">
                <input 
                    type="number" 
                    value={guess}
                    disabled={isLocked}
                    onChange={(e) => setGuess(e.target.value)}
                    className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 font-bold text-xl text-yellow-500 outline-none"
                    placeholder="000"
                />
                <button onClick={handleGuess} className="bg-yellow-500 text-black font-black px-8 rounded-xl uppercase">Guess</button>
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
                    <button key={l} onClick={() => startLevel(l)} className="bg-black border border-white/10 p-4 rounded-2xl hover:border-yellow-500 transition-all">
                        <p className="text-yellow-500 font-black text-[10px] uppercase">{l}</p>
                        <p className="text-white font-bold text-lg tracking-tighter">1-{LEVELS[l].range}</p>
                    </button>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}