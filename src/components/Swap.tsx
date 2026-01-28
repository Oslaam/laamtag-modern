import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { VersionedTransaction, PublicKey } from '@solana/web3.js';
import { SUPPORTED_TOKENS } from '../config/tokens';
import SeekerGuard from './SeekerGuard';

// --- SUCCESS MODAL ---
function SuccessModal({ hash, onClose }: { hash: string, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-[#0b0b0f] border border-white/5 p-8 rounded-[2.5rem] max-w-sm w-full text-center shadow-2xl">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                    <span className="text-4xl text-green-500">✓</span>
                </div>
                <h3 className="text-2xl font-black mb-2 text-white tracking-tight">Swap Success!</h3>
                <p className="text-gray-500 text-sm mb-6 px-4">Your transaction is secured by Solana and confirmed on-chain.</p>
                <a href={`https://solscan.io/tx/${hash}`} target="_blank" rel="noreferrer" className="block w-full py-4 mb-3 bg-white/5 hover:bg-white/10 rounded-2xl text-blue-400 font-bold transition-all border border-white/5">
                    View Transaction ↗
                </a>
                <button onClick={onClose} className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-2xl font-black transition-all text-white shadow-[0_10px_30px_rgba(34,197,94,0.3)]">
                    DONE
                </button>
            </div>
        </div>
    );
}

// --- REDESIGNED TOKEN SELECT (FORCED SMALL LOGOS) ---
function TokenSelect({ label, selectedToken, onSelect }: { label: string, selectedToken: any, onSelect: (token: any) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 py-2 px-3 rounded-2xl border border-white/5 transition-all group"
            >
                {/* THIS DIV FIXES THE LOGO SIZE ISSUE */}
                <div className="w-6 h-6 min-w-[24px] min-h-[24px] rounded-full overflow-hidden bg-black border border-white/10 flex-shrink-0">
                    <img
                        src={selectedToken.logo}
                        alt=""
                        className="w-full h-full object-cover block"
                        style={{ width: '24px', height: '24px' }} // Inline style to override global CSS
                    />
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-[10px] uppercase font-bold text-gray-500 leading-none mb-1 tracking-widest">{label}</span>
                    <span className="font-black text-sm text-white leading-none">{selectedToken.symbol} <span className="text-[10px] text-gray-600 ml-1 group-hover:text-blue-400 transition-colors">▼</span></span>
                </div>
            </button>

            {isOpen && (
                <div className="absolute right-0 z-[110] mt-3 w-64 bg-[#141519] border border-white/10 rounded-3xl shadow-2xl backdrop-blur-2xl p-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                        {SUPPORTED_TOKENS.map((token) => (
                            <div
                                key={token.mint}
                                onClick={() => { onSelect(token); setIsOpen(false); }}
                                className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl cursor-pointer transition-colors border-b border-white/5 last:border-0"
                            >
                                <img src={token.logo} className="w-8 h-8 rounded-full bg-black object-contain" alt="" />
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm text-white">{token.symbol}</span>
                                    <span className="text-[10px] text-gray-500">{token.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function SwapUI() {
    const { publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();

    const [inputToken, setInputToken] = useState(SUPPORTED_TOKENS[0]);
    const [outputToken, setOutputToken] = useState(SUPPORTED_TOKENS[1]);
    const [amount, setAmount] = useState('');
    const [balance, setBalance] = useState<number | null>(null);
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [slippageBps, setSlippageBps] = useState(50);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [prices, setPrices] = useState<{ [key: string]: number }>({});

    // --- FETCH REAL USD PRICES ---
    const fetchPrices = useCallback(async () => {
        try {
            const mints = SUPPORTED_TOKENS.map(t => t.mint).join(',');
            // Using v1 (price.jup.ag) because v2 (api.jup.ag) requires a paid API Key
            const res = await fetch(`https://price.jup.ag/v1/price?id=${mints}`);

            if (!res.ok) throw new Error("Price API limited");

            const data = await res.json();

            // CRITICAL FIX: Guard against undefined data.data
            if (data && data.data) {
                const priceMap: any = {};
                Object.keys(data.data).forEach(mint => {
                    priceMap[mint] = data.data[mint].price;
                });
                setPrices(priceMap);
            }
        } catch (err) {
            console.warn("Price fetch failed, UI will show $0.00 until refresh.");
        }
    }, []);

    useEffect(() => {
        fetchPrices();
        const interval = setInterval(fetchPrices, 30000);
        return () => clearInterval(interval);
    }, [fetchPrices]);

    const inputUsdValue = amount ? (Number(amount) * (prices[inputToken.mint] || 0)).toFixed(2) : "0.00";
    const outputAmountNum = quote ? (Number(quote.outAmount) / 10 ** outputToken.decimals) : 0;
    const outputUsdValue = (outputAmountNum * (prices[outputToken.mint] || 0)).toFixed(2);

    // --- LOGIC (KEEP AS IS) ---
    const fetchHistory = useCallback(async () => {
        if (!publicKey) return;
        try {
            const res = await fetch(`/api/user/swapActivity?wallet=${publicKey.toString()}`);
            const data = await res.json();
            setHistory(data.activities || []);
        } catch (err) { console.error(err); }
    }, [publicKey]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    useEffect(() => {
        const fetchBalance = async () => {
            if (!publicKey) return;
            try {
                if (inputToken.symbol === 'SOL') {
                    const solBal = await connection.getBalance(publicKey);
                    setBalance(solBal / 1e9);
                } else {
                    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: new PublicKey(inputToken.mint) });
                    setBalance(tokenAccounts.value.length > 0 ? tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount : 0);
                }
            } catch (err) { setBalance(0); }
        };
        fetchBalance();
    }, [publicKey, inputToken, connection]);

    const handleMax = () => {
        if (balance === null) return;
        const safetyBuffer = inputToken.symbol === 'SOL' ? 0.01 : 0;
        setAmount(Math.max(0, balance - safetyBuffer).toString());
    };

    useEffect(() => {
        const fetchQuote = async () => {
            if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setQuote(null); return; }
            setLoading(true);
            try {
                const rawAmount = Math.floor(Number(amount) * 10 ** inputToken.decimals).toString();
                const res = await fetch(`/api/swap/quote?inputMint=${inputToken.mint}&outputMint=${outputToken.mint}&amount=${rawAmount}&slippageBps=${slippageBps}`);
                const data = await res.json();
                setQuote(data);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        const timer = setTimeout(fetchQuote, 500);
        return () => clearTimeout(timer);
    }, [amount, inputToken, outputToken, slippageBps]);

    const handleSwap = async () => {
        if (!publicKey || !quote) return;
        setLoading(true);
        try {
            const { Buffer } = await import('buffer');
            const res = await fetch('/api/swap/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quoteResponse: quote, userPublicKey: publicKey.toString() })
            });
            const { swapTransaction } = await res.json();
            const transaction = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'));
            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            await fetch('/api/user/swapActivity/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet: publicKey.toString(), type: "SWAP", asset: `${inputToken.symbol}/${outputToken.symbol}`, amount: parseFloat(amount), signature: signature })
            });
            setTxHash(signature);
            fetchHistory();
        } catch (err) { alert("Swap failed."); } finally { setLoading(false); }
    };

    const exchangeRate = quote ? outputAmountNum / Number(amount) : null;

    return (
        <SeekerGuard>
            <div className="min-h-screen flex items-center justify-center px-4 py-20 bg-black">
                <div className="w-full max-w-[420px]">

                    {/* MAIN CARD */}
                    <div className="relative bg-[#0b0b0f] rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] p-6 text-white border border-white/[0.03]">
                        {txHash && <SuccessModal hash={txHash} onClose={() => setTxHash(null)} />}

                        {/* HEADER */}
                        <div className="flex items-center justify-between mb-8 px-2">
                            <div>
                                <h1 className="text-2xl font-black tracking-tighter">SWAP</h1>
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Fast · Secure · On-chain</p>
                            </div>
                            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-gray-400">
                                ⚙️
                            </button>
                        </div>

                        {/* SETTINGS POPUP */}
                        {isSettingsOpen && (
                            <div className="mb-6 p-4 bg-black/40 rounded-3xl border border-white/5 animate-in slide-in-from-top-2">
                                <p className="text-[10px] font-black text-gray-500 mb-3 uppercase tracking-widest">Slippage Tolerance</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {[10, 50, 100].map(val => (
                                        <button key={val} onClick={() => { setSlippageBps(val); setIsSettingsOpen(false); }}
                                            className={`py-2 rounded-xl text-xs font-bold transition-all ${slippageBps === val ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>
                                            {val / 100}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* PAY PANEL (REPLACED WITH CLEAN STRUCTURE) */}
                        <div className="p-5 bg-white/[0.03] rounded-3xl border border-white/5 mb-1 transition-all hover:border-white/10">
                            <div className="flex justify-between items-center mb-4">
                                <TokenSelect label="You Pay" selectedToken={inputToken} onSelect={setInputToken} />
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Balance</p>
                                    <button onClick={handleMax} className="text-xs font-black text-gray-300 hover:text-blue-500 transition-colors">
                                        {balance?.toFixed(4) || '0.00'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <input
                                    type="number"
                                    className="bg-transparent text-5xl font-black outline-none w-full placeholder-gray-800 tracking-tighter"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                            <div className="text-xs text-gray-600 font-bold mt-2">≈ ${inputUsdValue}</div>
                        </div>

                        {/* SWAP ARROW */}
                        <div className="flex justify-center -my-4 relative z-10">
                            <div className="w-10 h-10 rounded-2xl bg-[#0b0b0f] border-4 border-[#0b0b0f] flex items-center justify-center shadow-xl">
                                <div className="w-full h-full bg-white/[0.05] rounded-xl flex items-center justify-center text-blue-500 font-bold">↓</div>
                            </div>
                        </div>

                        {/* RECEIVE PANEL (REPLACED WITH CLEAN STRUCTURE) */}
                        <div className="p-5 bg-white/[0.03] rounded-3xl border border-white/5 mb-6 transition-all hover:border-white/10">
                            <div className="flex justify-between items-center mb-4">
                                <TokenSelect label="You Receive" selectedToken={outputToken} onSelect={setOutputToken} />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-5xl font-black tracking-tighter truncate text-white/90">
                                    {quote ? outputAmountNum.toFixed(4) : "0.00"}
                                </div>
                            </div>
                            <div className="text-xs text-gray-600 font-bold mt-2">≈ ${outputUsdValue}</div>
                        </div>

                        {/* INFO PANEL */}
                        {quote && (
                            <div className="mb-6 p-4 rounded-2xl bg-black/50 border border-white/5 space-y-3">
                                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-gray-600">
                                    <span>Rate</span>
                                    <span className="text-gray-300 font-medium">1 {inputToken.symbol} ≈ {exchangeRate?.toFixed(4)} {outputToken.symbol}</span>
                                </div>
                                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-gray-600">
                                    <span>Slippage</span>
                                    <span className="text-blue-500">{slippageBps / 100}%</span>
                                </div>
                            </div>
                        )}

                        {/* ACTION BUTTON */}
                        <button
                            onClick={handleSwap}
                            disabled={!quote || loading || !publicKey}
                            className="w-full py-5 rounded-[1.5rem] font-black text-sm tracking-[0.3em] uppercase bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-900 disabled:to-gray-900 disabled:text-gray-700 transition-all shadow-[0_20px_60px_rgba(79,70,229,0.3)] active:scale-[0.98]"
                        >
                            {loading ? 'EXECUTING...' : !publicKey ? 'Connect Wallet' : 'SWAP NOW'}
                        </button>

                        <p className="mt-6 text-center text-[10px] font-bold text-gray-700 uppercase tracking-[0.2em]">
                            Powered by Solana · Secure Execution
                        </p>
                    </div>

                    {/* RECENT ACTIVITY */}
                    {history.length > 0 && (
                        <div className="mt-8 px-2">
                            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mb-6 text-center">Recent Activity</h3>
                            <div className="space-y-3">
                                {history.slice(0, 3).map(tx => (
                                    <a key={tx.id} href={`https://solscan.io/tx/${tx.signature}`} target="_blank" rel="noreferrer"
                                        className="flex justify-between items-center p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-all group">
                                        <div>
                                            <p className="text-xs font-black text-white">{tx.amount} {tx.asset}</p>
                                            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter">{new Date(tx.createdAt).toLocaleTimeString()}</p>
                                        </div>
                                        <span className="text-blue-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">↗</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </SeekerGuard>
    );
}