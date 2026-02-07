import React, { useEffect, useState } from 'react';
import { RefreshCcw, ArrowRight, ExternalLink } from 'lucide-react';

export default function RaffleRefundSection({ walletAddress }: { walletAddress: string }) {
    const [refundableAmount, setRefundableAmount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [txSig, setTxSig] = useState<string | null>(null);

    useEffect(() => {
        async function fetchRefunds() {
            // FIX: Use backticks for string interpolation
            const res = await fetch(`/api/user/raffle-get-pending?walletAddress=${walletAddress}`);
            const data = await res.json();
            const total = data.rewards
                ?.filter((r: any) => r.type === 'REFUND')
                .reduce((sum: number, r: any) => sum + r.amount, 0);
            setRefundableAmount(total || 0);
        }
        if (walletAddress) fetchRefunds();
    }, [walletAddress]);

    const handleClaim = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/user/raffle-claim-refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress })
            });

            const data = await res.json();

            if (res.ok) {
                setRefundableAmount(0);
                setTxSig(data.signature); // Store the signature for the link
                alert(data.message);
            } else {
                alert(data.message || "Refund failed.");
            }
        } catch (err) {
            alert("An error occurred during the refund process.");
        } finally {
            setLoading(false);
        }
    };

    if (refundableAmount === 0 && !txSig) return null;

    return (
        <div className="terminal-card border-yellow-500/50 bg-yellow-500/5 mb-6 p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-yellow-500/20 rounded-full">
                        <RefreshCcw size={20} className={`text-yellow-500 ${loading ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                        <h4 className="text-yellow-500 font-bold text-sm uppercase tracking-widest">
                            {txSig ? 'Refund Complete' : 'Refund Detected'}
                        </h4>
                        <p className="text-gray-400 text-xs">
                            {txSig
                                ? "Your $SKR has been returned to your wallet."
                                : `${refundableAmount} $SKR from an expired Matrix Sprint is ready.`}
                        </p>
                    </div>
                </div>

                {!txSig ? (
                    <button
                        onClick={handleClaim}
                        disabled={loading}
                        className="terminal-button bg-yellow-500 text-black hover:bg-yellow-400 flex items-center gap-2 px-4 py-2"
                    >
                        {loading ? 'PROCESSING...' : 'CLAIM TO WALLET'} <ArrowRight size={14} />
                    </button>
                ) : (
                    <a
                        href={`https://solscan.io/tx/${txSig}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-yellow-500 hover:text-yellow-400 flex items-center gap-1 text-xs font-bold underline"
                    >
                        VIEW ON SOLSCAN <ExternalLink size={12} />
                    </a>
                )}
            </div>
        </div>
    );
}