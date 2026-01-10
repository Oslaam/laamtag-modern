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
        { label: "1 TAG", color: "#3b82f6" },
        { label: "5 TAG", color: "#2563eb" },
        { label: "50 L", color: "#eab308" },
        { label: "100 L", color: "#ca8a04" },
        { label: "500 L", color: "#a16207" },
        { label: "1 USDC", color: "#22c55e" },
        { label: "0.01 SOL", color: "#a855f7" },
        { label: "EMPTY", color: "#374151" },
        { label: "GEN BOX", color: "#ef4444" },
        { label: "SPEC BOX", color: "#f97316" },
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
            if (!res.ok) throw new Error(data.error || "Transaction failed");

            // 1. Calculate Precise Rotation
            const degreesPerSegment = 360 / segments.length; // 36deg
            const extraSpins = 3600; // 10 full circles for effect

            // This logic:
            // a) Reset previous rotation remainder to align to 0
            // b) Subtract (index * 36) to move the target segment to the top
            // c) Subtract (36 / 2) which is 18deg to hit the EXACT center of that slice
            const currentRotation = rotation - (rotation % 360);
            const targetOffset = (data.segmentIndex * degreesPerSegment) + (degreesPerSegment / 2);
            const newRotation = currentRotation + extraSpins + (360 - targetOffset);

            setRotation(newRotation);

            // 2. Wait for Animation to finish
            setTimeout(() => {
                setIsSpinning(false);
                if (data.rewardType.includes("BOX")) {
                    setBoxValue(data.rewardLabel);
                    setShowBox(true);
                } else {
                    toast.success(`WON: ${data.rewardLabel}`, {
                        style: { background: '#000', color: '#eab308', border: '1px solid #eab308' }
                    });
                }

                // Dispatch event for _app.tsx to update header stats
                window.dispatchEvent(new Event('balanceUpdate'));

            }, 4100);

        } catch (err: any) {
            toast.error(err.message);
            setIsSpinning(false);
        }
    };

    if (!mounted) return null;

    return (
        <div className="flex flex-col items-center w-full">
            <h2 className="text-xl font-black italic text-white uppercase mb-8">The Reactor Core</h2>

            {/* Wheel Container */}
            <div style={{ position: 'relative', width: '320px', height: '320px', marginBottom: '40px' }}>

                {/* Pointer */}
                <div style={{
                    position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', zIndex: 50,
                    width: 0, height: 0,
                    borderLeft: '15px solid transparent', borderRight: '15px solid transparent', borderTop: '30px solid #eab308',
                    filter: 'drop-shadow(0 0 10px #eab308)'
                }} />

                {/* The Wheel */}
                <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    position: 'relative',
                    border: '8px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 0 30px rgba(0,0,0,0.5)',
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)',
                    // Perfect pie slices using conic-gradient
                    background: `conic-gradient(${segments.map((seg, i) => `${seg.color} ${i * 36}deg ${(i + 1) * 36}deg`).join(', ')
                        })`
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
                            // +18deg offset centers the label in the 36deg slice
                            transform: `rotate(${i * 36 + 18}deg)`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            paddingTop: '15px',
                            zIndex: 10
                        }}>
                            <span style={{ fontSize: '22px', marginBottom: '2px', filter: 'drop-shadow(0 2px 2px black)' }}>
                                {seg.label.includes('BOX') ? '📦' : seg.label === 'EMPTY' ? '💀' : '🎁'}
                            </span>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: '900',
                                color: 'white',
                                textTransform: 'uppercase',
                                textAlign: 'center',
                                lineHeight: '1',
                                // Strong multi-directional text shadow for maximum legibility
                                textShadow: '2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000'
                            }}>
                                {seg.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Center Cap */}
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: '50px', height: '50px', backgroundColor: '#000', borderRadius: '50%',
                    border: '4px solid rgba(255,255,255,0.2)', zIndex: 40,
                    boxShadow: 'inset 0 0 10px rgba(255,255,255,0.2)'
                }} />
            </div>

            <button
                onClick={spin}
                disabled={isSpinning}
                className={`w-full py-5 rounded-full font-black uppercase italic transition-all shadow-[0_8px_0_#991b1b] active:shadow-none active:translate-y-2 ${isSpinning ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
            >
                {isSpinning ? "Spinning..." : "Engage Spin (5 TAG)"}
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