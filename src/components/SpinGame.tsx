import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import BoxModal from './BoxModal';

export default function SpinGame() {
    const { publicKey } = useWallet();
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [showBox, setShowBox] = useState(false);
    const [boxValue, setBoxValue] = useState("");

    // Wheel segments mapped to the 8 visual slices
    const segments = [
        { label: "500 L", icon: "/assets/images/laamtag-logo.jpg", color: "bg-yellow-500/20" },
        { label: "1 TAG", icon: null, color: "bg-blue-500/10" },
        { label: "EMPTY", icon: null, color: "bg-gray-800" }, // Represents 'Open Box'
        { label: "0.01 SOL", icon: null, color: "bg-purple-500/10" },
        { label: "1 USDC", icon: null, color: "bg-green-500/10" },
        { label: "GENERAL BOX", icon: null, color: "bg-red-500/10" },
        { label: "100 L", icon: "/assets/images/laamtag-logo.jpg", color: "bg-yellow-600/10" },
        { label: "5 TAG", icon: null, color: "bg-blue-600/10" },
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

            if (!res.ok) {
                throw new Error(data.error || "Transaction failed");
            }

            // Calculate rotation: 
            // 1. Current rotation base
            // 2. Add 5-10 full spins for speed effect (1800+ degrees)
            // 3. Offset by the segment index (index * 45 degrees)
            const degreesPerSegment = 45;
            const extraSpins = 1800;
            const newRotation = rotation + extraSpins + (data.segmentIndex * degreesPerSegment) - (rotation % 360);

            setRotation(newRotation);

            // Wait for the CSS transition (4s) + a small buffer
            setTimeout(() => {
                setIsSpinning(false);

                // If it's any type of box, trigger the special modal
                if (data.rewardType.includes("BOX")) {
                    setBoxValue(data.rewardLabel);
                    setShowBox(true);
                } else {
                    toast.success(`SYSTEM OUTPUT: ${data.rewardLabel}`, {
                        style: { background: '#000', color: '#eab308', border: '1px solid #eab308' }
                    });
                }
            }, 4100);

        } catch (err: any) {
            toast.error(err.message);
            setIsSpinning(false);
        }
    };

    return (
        <div className="flex flex-col items-center">
            <h2 className="text-xl font-black italic text-white uppercase mb-8 tracking-widest animate-pulse">
                The Reactor Core
            </h2>

            <div className="relative w-80 h-80 mb-10">
                {/* Fixed Top Needle */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]" />

                {/* Rotating Wheel Body */}
                <div
                    className="w-full h-full rounded-full border-[8px] border-white/10 relative overflow-hidden transition-transform duration-[4000ms] cubic-bezier(0.15, 0, 0.15, 1) shadow-[0_0_80px_rgba(255,255,255,0.05)]"
                    style={{ transform: `rotate(-${rotation}deg)` }}
                >
                    {segments.map((seg, i) => (
                        <div
                            key={i}
                            className={`absolute top-0 left-0 w-full h-full origin-center flex flex-col items-center pt-10 ${seg.color}`}
                            style={{
                                transform: `rotate(${i * 45}deg)`,
                                clipPath: 'polygon(50% 50%, 15% 0, 85% 0)'
                            }}
                        >
                            {seg.icon ? (
                                <img src={seg.icon} className="w-10 h-10 rounded-full mb-2 shadow-lg" alt="reward" />
                            ) : (
                                <div className="text-2xl mb-2">
                                    {seg.label === 'EMPTY' ? '📦' : '🎁'}
                                </div>
                            )}
                            <span className="text-[8px] font-black text-white uppercase tracking-tighter text-center px-2">
                                {seg.label}
                            </span>
                        </div>
                    ))}

                    {/* Center Core Decor */}
                    <div className="absolute inset-0 m-auto w-12 h-12 bg-black rounded-full border-4 border-white/20 z-10 flex items-center justify-center">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping" />
                    </div>
                </div>
            </div>

            {/* Engagement Button */}
            <button
                onClick={spin}
                disabled={isSpinning}
                className="group relative w-full bg-red-600 py-6 rounded-[2rem] overflow-hidden active:scale-95 transition-all shadow-[0_10px_0_rgb(153,27,27)] hover:shadow-[0_5px_0_rgb(153,27,27)] hover:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <div className="relative z-10 text-white font-black text-2xl italic tracking-tighter uppercase">
                    {isSpinning ? "Processing Core..." : "Engage Spin (5 TAG)"}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </button>

            {/* Special Box UI Pop-up */}
            <BoxModal
                isOpen={showBox}
                content={boxValue}
                onClose={() => setShowBox(false)}
            />
        </div>
    );
}