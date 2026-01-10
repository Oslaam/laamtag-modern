'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import BoxModal from './BoxModal';

export default function SpinGame() {
    const { publicKey } = useWallet();
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [showBox, setShowBox] = useState(false);
    const [boxValue, setBoxValue] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

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

    const spin = async () => {
        if (!publicKey || isSpinning) return;
        setIsSpinning(true);

        try {
            const res = await fetch('/api/games/spin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: publicKey.toString() })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "REACTION FAILURE");

            const degreesPerSegment = 360 / segments.length;
            const extraSpins = 3600;

            const currentRotation = rotation - (rotation % 360);
            const targetOffset = (data.segmentIndex * degreesPerSegment) + (degreesPerSegment / 2);
            const newRotation = currentRotation + extraSpins + (360 - targetOffset);

            setRotation(newRotation);

            setTimeout(() => {
                setIsSpinning(false);
                if (data.rewardType?.toUpperCase().includes("BOX")) {
                    setBoxValue(data.rewardLabel);
                    setShowBox(true);
                } else {
                    toast.success(`RECOVERY SUCCESS: ${data.rewardLabel}`, {
                        style: {
                            background: '#000',
                            color: '#eab308',
                            border: '1px solid #eab308',
                            fontSize: '10px',
                            fontWeight: 900
                        }
                    });
                }
                window.dispatchEvent(new Event('balanceUpdate'));
            }, 4100);

        } catch (err: any) {
            toast.error(err.message.toUpperCase());
            setIsSpinning(false);
        }
    };

    if (!mounted) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <h2 className="terminal-title" style={{ marginBottom: '40px', fontSize: '20px' }}>
                The <span style={{ color: '#eab308' }}>Reactor</span> Core
            </h2>

            {/* Wheel Container */}
            <div style={{ position: 'relative', width: '320px', height: '320px', marginBottom: '48px' }}>

                {/* Pointer - Stylized as a Laser/Needle */}
                <div style={{
                    position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', zIndex: 50,
                    width: 0, height: 0,
                    borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '24px solid #eab308',
                    filter: 'drop-shadow(0 0 15px rgba(234, 179, 8, 0.8))'
                }} />

                {/* The Wheel */}
                <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    position: 'relative',
                    border: '10px solid #111',
                    boxShadow: '0 0 0 2px rgba(255,255,255,0.05), 0 20px 50px rgba(0,0,0,0.8)',
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 4.1s cubic-bezier(0.15, 0, 0.15, 1)',
                    background: `conic-gradient(${segments.map((seg, i) => `${seg.color} ${i * 36}deg ${(i + 1) * 36}deg`).join(', ')})`
                }}>
                    {segments.map((seg, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            top: '0',
                            left: '50%',
                            height: '50%',
                            width: '60px',
                            marginLeft: '-30px',
                            transformOrigin: 'bottom center',
                            transform: `rotate(${i * 36 + 18}deg)`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            paddingTop: '20px',
                            zIndex: 10
                        }}>
                            <span style={{ fontSize: '24px', marginBottom: '4px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                                {seg.label.includes('BOX') ? '📦' : seg.label === 'EMPTY' ? '💀' : '⚡'}
                            </span>
                            <span style={{
                                fontSize: '9px',
                                fontWeight: '900',
                                color: 'white',
                                textTransform: 'uppercase',
                                textAlign: 'center',
                                lineHeight: '1',
                                textShadow: '1px 1px 0px #000, -1px -1px 0px #000, 2px 2px 4px #000'
                            }}>
                                {seg.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Center Cap - Mechanical Hub look */}
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: '60px', height: '60px',
                    background: 'radial-gradient(circle, #222 0%, #000 100%)',
                    borderRadius: '50%',
                    border: '4px solid #333', zIndex: 40,
                    boxShadow: '0 0 20px rgba(0,0,0,1), inset 0 0 10px rgba(255,255,255,0.1)'
                }}>
                    <div style={{ position: 'absolute', inset: '10px', borderRadius: '50%', border: '1px dashed rgba(234, 179, 8, 0.3)' }} />
                </div>
            </div>

            {/* Heavy Industrial Button */}
            <button
                onClick={spin}
                disabled={isSpinning}
                className="terminal-button"
                style={{
                    width: '100%',
                    padding: '20px',
                    background: isSpinning ? '#1f2937' : '#991b1b',
                    color: isSpinning ? 'rgba(255,255,255,0.2)' : '#fff',
                    border: 'none',
                    boxShadow: isSpinning ? 'none' : '0 6px 0 #450a0a',
                    transform: isSpinning ? 'translateY(4px)' : 'none',
                    fontSize: '14px',
                    letterSpacing: '2px'
                }}
            >
                {isSpinning ? "CORE STABILIZING..." : "ENGAGE REACTOR (5 TAG)"}
            </button>

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