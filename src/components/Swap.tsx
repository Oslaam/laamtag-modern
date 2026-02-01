import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { VersionedTransaction, PublicKey } from '@solana/web3.js';
import { SUPPORTED_TOKENS } from '../config/tokens';
import SeekerGuard from './SeekerGuard';

// --- SUCCESS MODAL: REDESIGNED ---
function SuccessModal({ hash, onClose }: { hash: string, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="terminal-card max-w-sm w-full text-center border-[#eab308]/50" style={{ padding: '2rem' }}>
                <div style={{ width: '60px', height: '60px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                    <span style={{ color: '#22c55e', fontSize: '24px', fontWeight: 900 }}>✓</span>
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Swap Executed</h3>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>Confirmed on Solana Mainnet</p>
                
                <a href={`https://solscan.io/tx/${hash}`} target="_blank" rel="noreferrer" 
                   style={{ display: 'block', width: '100%', padding: '12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#eab308', fontWeight: 900, fontSize: '12px', marginBottom: '10px', textTransform: 'uppercase' }}>
                    View Explorer ↗
                </a>
                <button onClick={onClose} className="primary-btn" style={{ width: '100%', background: '#eab308' }}>
                    CLOSE
                </button>
            </div>
        </div>
    );
}

// --- TOKEN SELECT: MODERN INDUSTRIAL ---
function TokenSelect({ label, selectedToken, onSelect }: { label: string, selectedToken: any, onSelect: (token: any) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} 
                style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '12px' }}>
                <img src={selectedToken.logo} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '8px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: '13px', fontWeight: 900, color: '#fff', margin: 0 }}>{selectedToken.symbol} <span style={{ color: '#eab308', fontSize: '10px' }}>▼</span></p>
                </div>
            </button>

            {isOpen && (
                <div style={{ position: 'absolute', left: 0, top: '110%', zIndex: 110, width: '220px', background: '#0b0b0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '8px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                    {SUPPORTED_TOKENS.map((token) => (
                        <div key={token.mint} onClick={() => { onSelect(token); setIsOpen(false); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', cursor: 'pointer' }} className="hover:bg-white/5 transition-colors">
                            <img src={token.logo} style={{ width: '24px', height: '24px', borderRadius: '50%' }} alt="" />
                            <div>
                                <p style={{ fontSize: '12px', fontWeight: 900, color: '#fff', margin: 0 }}>{token.symbol}</p>
                                <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{token.name}</p>
                            </div>
                        </div>
                    ))}
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

    // --- PRICES & LOGIC (UNCHANGED) ---
    const fetchPrices = useCallback(async () => {
        try {
            const mints = SUPPORTED_TOKENS.map(t => t.mint).join(',');
            const res = await fetch(`https://price.jup.ag/v1/price?id=${mints}`);
            const data = await res.json();
            if (data && data.data) {
                const priceMap: any = {};
                Object.keys(data.data).forEach(mint => { priceMap[mint] = data.data[mint].price; });
                setPrices(priceMap);
            }
        } catch (err) { console.warn("Price fetch failed"); }
    }, []);

    useEffect(() => {
        fetchPrices();
        const interval = setInterval(fetchPrices, 30000);
        return () => clearInterval(interval);
    }, [fetchPrices]);

    const inputUsdValue = amount ? (Number(amount) * (prices[inputToken.mint] || 0)).toFixed(2) : "0.00";
    const outputAmountNum = quote ? (Number(quote.outAmount) / 10 ** outputToken.decimals) : 0;
    const outputUsdValue = (outputAmountNum * (prices[outputToken.mint] || 0)).toFixed(2);

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
            <div className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <div className="content-wrapper" style={{ width: '100%', maxWidth: '440px' }}>

                    {/* SWAP CARD */}
                    <div className="terminal-card" style={{ padding: '1.5rem', position: 'relative' }}>
                        {txHash && <SuccessModal hash={txHash} onClose={() => setTxHash(null)} />}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', textTransform: 'uppercase', margin: 0 }}>SWAP</h1>
                                <p style={{ fontSize: '9px', fontWeight: 900, color: '#eab308', textTransform: 'uppercase', opacity: 0.6 }}>On-Chain Protocol</p>
                            </div>
                            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '10px' }}>
                                ⚙️
                            </button>
                        </div>

                        {/* SETTINGS */}
                        {isSettingsOpen && (
                            <div className="terminal-card" style={{ marginBottom: '1rem', background: 'rgba(0,0,0,0.4)' }}>
                                <p style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '8px' }}>Slippage</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                    {[10, 50, 100].map(val => (
                                        <button key={val} onClick={() => { setSlippageBps(val); setIsSettingsOpen(false); }}
                                            style={{ padding: '6px', fontSize: '10px', fontWeight: 900, borderRadius: '8px', border: '1px solid', borderColor: slippageBps === val ? '#eab308' : 'rgba(255,255,255,0.1)', color: slippageBps === val ? '#eab308' : 'rgba(255,255,255,0.4)' }}>
                                            {val / 100}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* INPUT PANEL */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '16px', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <TokenSelect label="Pay" selectedToken={inputToken} onSelect={setInputToken} />
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '8px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Available</p>
                                    <button onClick={handleMax} style={{ fontSize: '11px', fontWeight: 900, color: '#fff' }}>{balance?.toFixed(4) || '0.00'}</button>
                                </div>
                            </div>
                            <input type="number" className="bg-transparent text-4xl font-black outline-none w-full text-white placeholder-zinc-800" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                            <div style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>≈ ${inputUsdValue}</div>
                        </div>

                        {/* ARROW */}
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '-12px 0', position: 'relative', zIndex: 10 }}>
                            <div style={{ width: '32px', height: '32px', background: '#0b0b0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308', fontWeight: 900 }}>↓</div>
                        </div>

                        {/* OUTPUT PANEL */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '16px', marginBottom: '1.5rem' }}>
                            <TokenSelect label="Receive" selectedToken={outputToken} onSelect={setOutputToken} />
                            <div style={{ fontSize: '36px', fontWeight: 900, color: '#fff', margin: '8px 0' }}>{quote ? outputAmountNum.toFixed(4) : "0.00"}</div>
                            <div style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.2)' }}>≈ ${outputUsdValue}</div>
                        </div>

                        {/* INFO BOX */}
                        {quote && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>Exchange Rate</span>
                                    <span style={{ color: '#fff' }}>1 {inputToken.symbol} = {exchangeRate?.toFixed(4)} {outputToken.symbol}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>Network Slippage</span>
                                    <span style={{ color: '#eab308' }}>{slippageBps / 100}%</span>
                                </div>
                            </div>
                        )}

                        <button onClick={handleSwap} disabled={!quote || loading || !publicKey} className="primary-btn" style={{ width: '100%', background: !quote ? '#111' : '#eab308', color: !quote ? '#333' : '#000', letterSpacing: '0.2em' }}>
                            {loading ? 'EXECUTING...' : !publicKey ? 'CONNECT WALLET' : 'CONFIRM SWAP'}
                        </button>
                    </div>

                    {/* RECENT ACTIVITY */}
                    {history.length > 0 && (
                        <div style={{ marginTop: '2rem' }}>
                            <p style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.4em', marginBottom: '1rem' }}>Terminal Logs</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {history.slice(0, 3).map(tx => (
                                    <a key={tx.id} href={`https://solscan.io/tx/${tx.signature}`} target="_blank" rel="noreferrer"
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }} className="hover:border-[#eab308]/30 transition-all">
                                        <div>
                                            <p style={{ fontSize: '11px', fontWeight: 900, color: '#fff', margin: 0 }}>{tx.amount} {tx.asset}</p>
                                            <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{new Date(tx.createdAt).toLocaleTimeString()}</p>
                                        </div>
                                        <span style={{ color: '#eab308' }}>↗</span>
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