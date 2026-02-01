import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useLaamProgram } from '../hooks/use-laam-program';
import { toast } from 'react-hot-toast';

export const DomainRegister = () => {
    const { publicKey } = useWallet();
    const [name, setName] = useState('');
    const [years, setYears] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isEligibleForFree, setIsEligibleForFree] = useState(false);
    const [hasDomain, setHasDomain] = useState(false);
    const [txSig, setTxSig] = useState<string | null>(null);
    const { registerName, getPrice } = useLaamProgram();

    // --- COUNTDOWN LOGIC ---
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const targetDate = new Date("2026-02-15T00:00:00").getTime();
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const difference = targetDate - now;

            if (difference < 0) {
                clearInterval(interval);
            } else {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((difference % (1000 * 60)) / 1000),
                });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const currentPrice = name.length >= 3 ? getPrice(name.length, years) : 0;

    return (
        <section className="relative overflow-hidden my-10 border border-[#eab308]/20 rounded-3xl bg-black/40 backdrop-blur-md">
            
            {/* 1. THE BLOCKER OVERLAY - Modern Industrial Style */}
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ 
                        display: 'inline-block', 
                        padding: '4px 12px', 
                        backgroundColor: '#eab308', 
                        color: '#000', 
                        fontSize: '10px', 
                        fontWeight: 900, 
                        borderRadius: '4px', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                    }} className="animate-pulse">
                        System Update: 90%
                    </div>
                </div>
                
                <h2 style={{ color: '#fff', fontSize: '32px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '2rem' }}>
                    Registry <span style={{ color: '#eab308' }}>Locked</span>
                </h2>

                {/* COUNTDOWN TIMER - Styled like Quests Page headers */}
                {/* <div style={{ display: 'flex', gap: '20px', marginBottom: '2rem' }}>
                    {[
                        { label: 'Days', value: timeLeft.days },
                        { label: 'Hrs', value: timeLeft.hours },
                        { label: 'Min', value: timeLeft.minutes },
                        { label: 'Sec', value: timeLeft.seconds }
                    ].map((unit, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>
                                {String(unit.value).padStart(2, '0')}
                            </span>
                            <span style={{ fontSize: '9px', fontWeight: 900, color: '#eab308', textTransform: 'uppercase', opacity: 0.6 }}>
                                {unit.label}
                            </span>
                        </div>
                    ))}
                </div> */}
                
                {/* PROGRESS BAR - Matching Mint.tsx */}
                <div className="terminal-card" style={{ width: '100%', maxWidth: '300px', background: 'transparent', border: 'none', padding: 0 }}>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
                        <div style={{
                            width: '90%',
                            height: '100%',
                            background: '#eab308',
                            boxShadow: '0 0 15px #eab308'
                        }} />
                    </div>
                    <p style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                        Initializing Protocol
                    </p>
                </div>
            </div>

            {/* 2. THE BACKGROUND CONTENT (Blurred/Disabled) */}
            <div className="p-8 opacity-10 pointer-events-none select-none filter blur-md">
                <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '1rem', textTransform: 'uppercase' }}>
                    Claim (.laam) Name
                </h2>
                
                <div className="terminal-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1, background: '#111', border: '1px solid #333', padding: '16px', borderRadius: '12px', color: '#555' }}>
                            enter-name
                        </div>
                        <div style={{ background: '#111', border: '1px solid #333', padding: '16px', borderRadius: '12px', color: '#555' }}>
                            1 Year
                        </div>
                    </div>

                    <button className="primary-btn" style={{ width: '100%', backgroundColor: '#222', color: '#444' }}>
                        REGISTER LOCKED
                    </button>
                </div>
            </div>
        </section>
    );
};