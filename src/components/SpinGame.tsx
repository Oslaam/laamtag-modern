'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import BoxModal from './BoxModal';

export default function SpinGame() {
    const { publicKey } = useWallet();
    const [isSpinning, setIsSpinning] = useState(false);
    const [isAutoSpinning, setIsAutoSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [showBox, setShowBox] = useState(false);
    const [boxValue, setBoxValue] = useState("");
    const [mounted, setMounted] = useState(false);

    const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isAutoSpinningRef = useRef(false);
    const isSpinningRef = useRef(false);

    useEffect(() => {
        setMounted(true);
        return () => { if (pressTimerRef.current) clearTimeout(pressTimerRef.current); };
    }, []);

    const segments = [
        { label: "1 TAG", color: "#1e3a8a" },
        { label: "5 TAG", color: "#1e40af" },
        { label: "50 L", color: "#854d0e" },
        { label: "100 L", color: "#a16207" },
        { label: "500 L", color: "#ca8a04" },
        { label: "1 USDC", color: "#166534" },
        { label: "0.01 SOL", color: "#6b21a8" },
        { label: "EMPTY", color: "#1f2937" },
        { label: "GEN BOX", color: "#991b1b" },
        { label: "SPEC BOX", color: "#c2410c" },
    ];

    const spin = useCallback(async () => {
        if (!publicKey || isSpinningRef.current) return;

        setIsSpinning(true);
        isSpinningRef.current = true;

        try {
            const res = await fetch('/api/games/spin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: publicKey.toString() })
            });

            const data = await res.json();

            if (!res.ok) {
                setIsAutoSpinning(false);
                isAutoSpinningRef.current = false;
                throw new Error(data.error || "REACTION FAILURE");
            }

            const degreesPerSegment = 360 / segments.length;
            const extraSpins = 3600; // 10 rotations

            const currentRotationBase = Math.floor(rotation / 360) * 360;
            const targetOffset = (data.segmentIndex * degreesPerSegment) + (degreesPerSegment / 2);
            const newRotation = currentRotationBase + extraSpins + (360 - targetOffset);

            setRotation(newRotation);

            // SPEED UPDATE: Animation duration reduced to 2.5s for faster spinning
            await new Promise(resolve => setTimeout(resolve, 2500));

            setIsSpinning(false);
            isSpinningRef.current = false;

            if (data.rewardType?.toUpperCase().includes("BOX")) {
                setBoxValue(data.rewardLabel);
                setShowBox(true);
                setIsAutoSpinning(false);
                isAutoSpinningRef.current = false;
            } else {
                toast.success(`RECOVERY SUCCESS: ${data.rewardLabel}`, {
                    style: { background: '#000', color: '#eab308', border: '1px solid #eab308', fontSize: '10px', fontWeight: 900 }
                });
            }

            window.dispatchEvent(new Event('balanceUpdate'));

            if (isAutoSpinningRef.current) {
                // Short 500ms delay between spins to maintain high energy
                setTimeout(() => spin(), 500);
            }

        } catch (err: any) {
            toast.error(err.message.toUpperCase());
            setIsSpinning(false);
            isSpinningRef.current = false;
            setIsAutoSpinning(false);
            isAutoSpinningRef.current = false;
        }
    }, [publicKey, rotation, segments.length]);

    const handlePointerDown = () => {
        if (isSpinning || isAutoSpinning) return;
        pressTimerRef.current = setTimeout(() => {
            setIsAutoSpinning(true);
            isAutoSpinningRef.current = true;
            spin();
            toast('AUTO-MODE LOCKED', { icon: '⚙️', style: { background: '#eab308', color: '#000', fontWeight: 'bold' } });
        }, 800);
    };

    const handlePointerUp = () => {
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
    };

    const handleButtonClick = () => {
        if (isAutoSpinning) {
            setIsAutoSpinning(false);
            isAutoSpinningRef.current = false;
            toast('DISENGAGING...', { style: { fontSize: '10px' } });
        } else if (!isSpinning) {
            spin();
        }
    };

    if (!mounted) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <h2 className="terminal-title" style={{ marginBottom: '40px', fontSize: '20px' }}>
                The <span style={{ color: '#eab308' }}>Reactor</span> Core
            </h2>

            <div style={{ position: 'relative', width: '320px', height: '320px', marginBottom: '48px' }}>
                <div style={{
                    position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', zIndex: 50,
                    width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '24px solid #eab308',
                    filter: 'drop-shadow(0 0 15px rgba(234, 179, 8, 0.8))'
                }} />

                <div style={{
                    width: '100%', height: '100%', borderRadius: '50%', position: 'relative', border: '10px solid #111',
                    transform: `rotate(${rotation}deg)`,
                    // SPEED UPDATE: Transition changed to 2.5s
                    transition: 'transform 2.5s cubic-bezier(0.15, 0, 0.15, 1)',
                    background: `conic-gradient(${segments.map((seg, i) => `${seg.color} ${i * 36}deg ${(i + 1) * 36}deg`).join(', ')})`
                }}>
                    {segments.map((seg, i) => (
                        <div key={i} style={{
                            position: 'absolute', top: '0', left: '50%', height: '50%', width: '60px', marginLeft: '-30px',
                            transformOrigin: 'bottom center', transform: `rotate(${i * 36 + 18}deg)`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px'
                        }}>
                            <span style={{ fontSize: '24px' }}>{seg.label.includes('BOX') ? '📦' : seg.label === 'EMPTY' ? '💀' : '⚡'}</span>
                            <span style={{ fontSize: '9px', fontWeight: '900', color: 'white', textShadow: '1px 1px 2px #000' }}>{seg.label}</span>
                        </div>
                    ))}
                </div>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '60px', height: '60px', background: '#000', borderRadius: '50%', border: '4px solid #333', zIndex: 40 }} />
            </div>

            <div style={{ width: '100%', textAlign: 'center' }}>
                <button
                    onMouseDown={handlePointerDown}
                    onMouseUp={handlePointerUp}
                    onTouchStart={handlePointerDown}
                    onTouchEnd={handlePointerUp}
                    onClick={handleButtonClick}
                    className="terminal-button"
                    style={{
                        width: '100%',
                        padding: '24px',
                        background: isAutoSpinning ? '#450a0a' : isSpinning ? '#1f2937' : '#991b1b',
                        color: '#fff',
                        border: isAutoSpinning ? '2px solid #ef4444' : 'none',
                        boxShadow: (isSpinning && !isAutoSpinning) ? 'none' : '0 6px 0 #000',
                        cursor: 'pointer',
                        fontWeight: '900'
                    }}
                >
                    {isAutoSpinning
                        ? "STOP AUTO-PROCESS"
                        : isSpinning
                            ? "CORE STABILIZING..."
                            : "ENGAGE REACTOR (5 TAG)"}
                </button>

                {!isSpinning && !isAutoSpinning && (
                    <p style={{ fontSize: '10px', color: '#666', marginTop: '12px' }}>
                        HOLD FOR AUTO-SPIN | TAP FOR SINGLE
                    </p>
                )}
            </div>

            <BoxModal
                isOpen={showBox}
                content={boxValue}
                onClose={() => {
                    setShowBox(false);
                    window.dispatchEvent(new Event('balanceUpdate'));
                }}
            />
        </div>
    );
}