import { useState, useEffect } from 'react';
import axios from 'axios';
import { History, CheckCircle2, Shield, Clock, RotateCcw } from 'lucide-react';

export default function RaffleHistory({ walletAddress }: { walletAddress: string }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`/api/games/raffle/get-history?walletAddress=${walletAddress}`);
                setHistory(res.data.history || []);
            } catch (e) {
                console.error("History error", e);
            } finally {
                setLoading(false);
            }
        };
        if (walletAddress) fetchHistory();
    }, [walletAddress]);

    const getStatusStyle = (status: string, result: string) => {
        if (result.includes('WINNER')) return { color: '#22c55e', label: 'WINNER', icon: <CheckCircle2 size={12} /> };
        if (status === 'EXPIRED') return { color: '#ef4444', label: 'EXPIRED', icon: <RotateCcw size={12} /> };
        if (status === 'OPEN') return { color: '#eab308', label: 'IN PROGRESS', icon: <Clock size={12} /> };
        // Updated to Shield for Challenger
        return { color: 'rgba(255,255,255,0.4)', label: 'CHALLENGER', icon: <Shield size={12} /> };
    };

    if (loading) return <div className="text-center p-4 opacity-50 text-xs">LOADING PROTOCOL HISTORY...</div>;

    return (
        <div className="terminal-card" style={{ marginTop: '20px', padding: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                <History size={16} className="text-yellow-500" />
                <h3 style={{ fontSize: '12px', fontWeight: 900, color: '#eab308', margin: 0 }}>PERSONAL SPRINT LOG</h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                            <th style={{ padding: '8px 4px' }}>Pool ID</th>
                            <th style={{ padding: '8px 4px' }}>Fee</th>
                            <th style={{ padding: '8px 4px' }}>Result</th>
                            <th style={{ padding: '8px 4px', textAlign: 'right' }}>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((game: any) => {
                            const style = getStatusStyle(game.status, game.userResult);
                            const isMe = game.walletAddress === walletAddress;

                            return (
                                <tr key={game.id} style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    background: isMe ? 'rgba(234, 179, 8, 0.1)' : 'transparent',
                                    borderLeft: isMe ? '2px solid #eab308' : 'none'
                                }}>
                                    <td style={{ padding: '10px 4px', fontFamily: 'monospace', color: isMe ? '#eab308' : 'inherit' }}>
                                        #{game.id.slice(-6).toUpperCase()}
                                    </td>
                                    <td style={{ padding: '10px 4px' }}>{game.fee} SKR</td>
                                    <td style={{ padding: '10px 4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: style.color }}>
                                            {style.icon}
                                            {/* We use .replace here to dynamically turn LOSER into CHALLENGER for existing data */}
                                            <span style={{ fontWeight: 800 }}>{game.userResult.replace('_', ' ').replace('LOSER', 'CHALLENGER')}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 4px', textAlign: 'right', opacity: 0.6 }}>
                                        {new Date(game.createdAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {history.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', opacity: 0.3 }}>NO DATA IN LOGS</div>
                )}
            </div>
        </div>
    );
}