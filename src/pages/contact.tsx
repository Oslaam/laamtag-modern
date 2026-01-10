import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { Send, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import axios from 'axios';

export default function ContactPage() {
    const { publicKey } = useWallet();
    const [view, setView] = useState<'form' | 'history'>('form');
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState<'success' | 'error' | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        type: 'Complaint', name: '', email: '', title: '', description: ''
    });

    useEffect(() => {
        if (publicKey && view === 'history') {
            axios.get(`/api/user/messages?address=${publicKey.toBase58()}`)
                .then(res => setHistory(res.data))
                .catch(err => console.error("History error", err));
        }
    }, [publicKey, view]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/api/user/contact', {
                ...formData,
                walletAddress: publicKey?.toBase58() || 'Anonymous'
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
        <div className="main-content">
            <Head><title>LAAMTAG | The Bridge</title></Head>

            {/* TRANSMISSION MODAL */}
            {showModal && (
                <div className="overlay">
                    <div className="terminal-modal" style={{ border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                        {showModal === 'success' ? (
                            <CheckCircle size={50} color="#eab308" style={{ margin: '0 auto' }} />
                        ) : (
                            <XCircle size={50} color="#ef4444" style={{ margin: '0 auto' }} />
                        )}
                        <h2 className="page-title" style={{ fontSize: '1.5rem', marginTop: '1rem' }}>
                            {showModal === 'success' ? 'TRANSMITTED' : 'FAILED'}
                        </h2>
                        <p className="terminal-desc">
                            {showModal === 'success' ? 'Your message has reached the Vault.' : 'Transmission interrupted.'}
                        </p>
                        <button onClick={() => setShowModal(null)} className="primary-btn" style={{ marginTop: '1rem' }}>
                            CLOSE
                        </button>
                    </div>
                </div>
            )}

            <div className="content-wrapper">

                {/* HEADER SECTION - Pattern from Profile/Games */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <Link href="/" style={{
                        background: 'rgba(255,255,255,0.05)',
                        padding: '12px',
                        borderRadius: '12px',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div style={{ textAlign: 'right' }}>
                        <h1 className="page-title" style={{ color: '#eab308', margin: 0, fontSize: '1.5rem' }}>THE BRIDGE</h1>
                        <p className="terminal-desc" style={{ fontSize: '9px', margin: 0, letterSpacing: '1px' }}>
                            SECURE COMMS CHANNEL
                        </p>
                    </div>
                </div>

                {/* TAB SELECTOR - Pattern from GamesPage */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '4px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    marginBottom: '32px'
                }}>
                    <button
                        onClick={() => setView('form')}
                        style={{
                            flex: 1,
                            background: view === 'form' ? '#eab308' : 'transparent',
                            color: view === 'form' ? '#000' : '#666',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <Send size={14} /> NEW MESSAGE
                    </button>
                    <button
                        onClick={() => setView('history')}
                        style={{
                            flex: 1,
                            background: view === 'history' ? '#eab308' : 'transparent',
                            color: view === 'history' ? '#000' : '#666',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <Clock size={14} /> HISTORY
                    </button>
                </div>

                {/* CONTENT AREA */}
                {view === 'form' ? (
                    <div className="terminal-card" style={{ padding: '24px' }}>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="input-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>TYPE</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        style={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff' }}
                                    >
                                        <option value="Complaint">COMPLAINT</option>
                                        <option value="Suggestion">SUGGESTION</option>
                                    </select>
                                </div>
                                <div className="input-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>OPERATOR NAME</label>
                                    <input
                                        required type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        style={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff' }}
                                    />
                                </div>
                            </div>

                            <div className="input-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>REPLY EMAIL</label>
                                <input
                                    required type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    style={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff' }}
                                />
                            </div>

                            <div className="input-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>SUBJECT</label>
                                <input
                                    required type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    style={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff' }}
                                />
                            </div>

                            <div className="input-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>DESCRIPTION</label>
                                <textarea
                                    required rows={5}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    style={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff', resize: 'none' }}
                                />
                            </div>

                            <button disabled={loading} className="primary-btn">
                                {loading ? "UPLOADING..." : "EXECUTE TRANSMISSION"}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {history.length === 0 ? (
                            <div className="terminal-card" style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.2)' }}>
                                NO ARCHIVED MESSAGES
                            </div>
                        ) : (
                            history.map((ticket) => (
                                <div key={ticket.id} className="terminal-card" style={{ padding: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '8px', fontWeight: 900, background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', padding: '4px 8px', borderRadius: '4px' }}>
                                            {ticket.type.toUpperCase()}
                                        </span>
                                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px 0' }}>{ticket.title}</h3>
                                    <p className="terminal-desc" style={{ marginBottom: '16px' }}>{ticket.description}</p>
                                    <div style={{
                                        fontSize: '9px',
                                        fontWeight: 900,
                                        color: ticket.status === 'Pending' ? '#3b82f6' : '#22c55e',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        STATUS: {ticket.status.toUpperCase()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                <p style={{ marginTop: '48px', textAlign: 'center', fontSize: '8px', color: 'rgba(255,255,255,0.2)', fontWeight: 900, letterSpacing: '0.2em' }}>
                    AUTHORIZED COMMS MODULE // LAAM TERMINAL V.01
                </p>
            </div>
        </div>
    );
}