import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useWallet } from '@solana/wallet-adapter-react';
import { ArrowLeft, Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';

export default function ContactPage() {
    const { publicKey } = useWallet();
    const [view, setView] = useState<'form' | 'history'>('form');
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState<'success' | 'error' | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        type: 'Complaint',
        name: '',
        email: '',
        title: '',
        description: ''
    });

    // Fetch history when user clicks the history tab
    useEffect(() => {
        if (publicKey && view === 'history') {
            axios.get(`/api/user/messages?address=${publicKey.toBase58()}`)
                .then(res => setHistory(res.data))
                .catch(err => console.error("History fetch error:", err));
        }
    }, [publicKey, view]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await axios.post('/api/user/contact', {
                ...formData,
                walletAddress: publicKey?.toBase58() || 'Not Connected'
            });
            setShowModal('success');
            setFormData({ type: 'Complaint', name: '', email: '', title: '', description: '' });
        } catch (err) {
            setShowModal('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans pb-20 px-6 relative">
            <Head><title>LAAMTAG | Contact Support</title></Head>

            {/* --- CUSTOM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in duration-300">
                        {showModal === 'success' ? (
                            <>
                                <CheckCircle size={60} className="text-yellow-500 mx-auto mb-4" />
                                <h3 className="text-2xl font-black uppercase italic text-yellow-500">Transmitted</h3>
                                <p className="text-gray-400 text-sm mt-2 mb-6">Your message has reached the Vault.</p>
                            </>
                        ) : (
                            <>
                                <XCircle size={60} className="text-red-500 mx-auto mb-4" />
                                <h3 className="text-2xl font-black uppercase italic text-red-500">Failed</h3>
                                <p className="text-gray-400 text-sm mt-2 mb-6">Transmission interrupted.</p>
                            </>
                        )}
                        <button onClick={() => setShowModal(null)} className="w-full bg-white text-black font-black py-3 rounded-xl uppercase text-xs tracking-widest hover:bg-yellow-500 transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-2xl mx-auto py-12">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-yellow-500 transition-colors mb-8 uppercase text-[10px] font-bold tracking-widest">
                    <ArrowLeft size={14} /> Back to Dashboard
                </Link>

                <div className="text-center mb-12">
                    <h1 className="text-5xl font-black italic tracking-tighter text-yellow-500 uppercase">The Bridge</h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">Secure Communications Channel</p>
                </div>

                {/* --- TABS --- */}
                <div className="flex gap-4 mb-8 bg-gray-900/50 p-2 rounded-2xl border border-gray-800">
                    <button
                        onClick={() => setView('form')}
                        className={`flex-1 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${view === 'form' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Send size={14} className="inline mr-2" /> New Message
                    </button>
                    <button
                        onClick={() => setView('history')}
                        className={`flex-1 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${view === 'history' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Clock size={14} className="inline mr-2" /> History
                    </button>
                </div>

                {view === 'form' ? (
                    <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900/40 p-8 rounded-[2.5rem] border border-gray-800/50 backdrop-blur-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-gray-500 ml-2">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full bg-black border border-gray-800 rounded-2xl px-4 py-4 text-sm focus:border-yellow-500 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="Complaint">Complaint</option>
                                    <option value="Suggestion">Suggestion</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-gray-500 ml-2">Your Name</label>
                                <input
                                    required type="text" value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-black border border-gray-800 rounded-2xl px-4 py-4 text-sm focus:border-yellow-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-gray-500 ml-2">Email for Reply</label>
                            <input
                                required type="email" value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-black border border-gray-800 rounded-2xl px-4 py-4 text-sm focus:border-yellow-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-gray-500 ml-2">Subject</label>
                            <input
                                required type="text" value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-black border border-gray-800 rounded-2xl px-4 py-4 text-sm focus:border-yellow-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-gray-500 ml-2">Description</label>
                            <textarea
                                required rows={4} value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-black border border-gray-800 rounded-2xl px-4 py-4 text-sm focus:border-yellow-500 outline-none resize-none"
                            ></textarea>
                        </div>
                        <button disabled={loading} className="w-full bg-yellow-500 text-black font-black py-5 rounded-2xl hover:bg-white hover:scale-[1.01] transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                            {loading ? "TRANSMITTING..." : <><Send size={16} /> SEND MESSAGE</>}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-4">
                        {history.length === 0 ? (
                            <div className="text-center py-20 bg-gray-900/20 border border-gray-800 border-dashed rounded-[2.5rem]">
                                <p className="text-gray-600 uppercase text-[10px] font-black tracking-widest">No transmission history found.</p>
                            </div>
                        ) : (
                            history.map((ticket) => (
                                <div key={ticket.id} className="bg-gray-900/40 border border-gray-800 p-6 rounded-3xl hover:border-yellow-500/30 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-md font-black uppercase tracking-tighter">{ticket.type}</span>
                                            <h4 className="font-bold mt-2 text-white">{ticket.title}</h4>
                                        </div>
                                        <span className="text-[9px] text-gray-500 font-mono">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-400 line-clamp-2">{ticket.description}</p>
                                    <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                                        <div className={`w-1.5 h-1.5 rounded-full ${ticket.status === 'Pending' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                                        <span className={ticket.status === 'Pending' ? 'text-blue-500' : 'text-green-500'}>
                                            Status: {ticket.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}