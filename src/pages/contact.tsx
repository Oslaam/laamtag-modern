import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { Send, Clock, CheckCircle, XCircle, ArrowLeft, Copy, Check } from 'lucide-react';
import axios from 'axios';
import styles from '../styles/Contact.module.css';

export default function ContactPage() {
    const { publicKey } = useWallet();
    const [view, setView] = useState<'form' | 'history'>('form');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const [showModal, setShowModal] = useState<{ type: 'success' | 'error'; id?: string } | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        type: 'Complaint', name: '', email: '', title: '', description: '',
    });

    useEffect(() => {
        if (publicKey && view === 'history') {
            axios.get(`/api/user/messages?address=${publicKey.toBase58()}`)
                .then(res => setHistory(res.data))
                .catch(err => console.error('History error', err));
        }
    }, [publicKey, view]);

    const generateTicketId = () => {
        const randomHex = Math.random().toString(16).toUpperCase().substring(2, 6);
        return `TX-${randomHex}-${new Date().getFullYear()}`;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const ticketId = generateTicketId();
        try {
            await axios.post('/api/user/contact', {
                ...formData, ticketId,
                walletAddress: publicKey?.toBase58() || 'Anonymous',
            });
            setShowModal({ type: 'success', id: ticketId });
            setFormData({ type: 'Complaint', name: '', email: '', title: '', description: '' });
        } catch {
            setShowModal({ type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const TABS = [
        { id: 'form', icon: <Send size={13} />, label: 'TICKET' },
        { id: 'history', icon: <Clock size={13} />, label: 'HISTORY' },
    ] as const;

    return (
        <div className={styles.page}>
            <Head><title>LAAMTAG | The Bridge</title></Head>

            {/* ── MODAL ── */}
            {showModal && (
                <div className={styles.overlay}>
                    <div className={styles.modal}>
                        <div className={`${styles.modalIconWrap} ${showModal.type === 'success' ? styles.modalIconSuccess : styles.modalIconError}`}>
                            {showModal.type === 'success'
                                ? <CheckCircle size={28} />
                                : <XCircle size={28} />}
                        </div>
                        <h2 className={styles.modalTitle}>
                            {showModal.type === 'success' ? 'TRANSMITTED' : 'FAILED'}
                        </h2>
                        {showModal.type === 'success' && showModal.id && (
                            <div className={styles.idContainer}>
                                <p className={styles.idLabel}>REFERENCE ID</p>
                                <div className={styles.idRow}>
                                    <code className={styles.idCode}>{showModal.id}</code>
                                    <button onClick={() => copyToClipboard(showModal.id!)} className={styles.copyBtn}>
                                        {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                        )}
                        <p className={styles.modalDesc}>
                            {showModal.type === 'success'
                                ? 'Your message has reached the Vault databanks.'
                                : 'Transmission interrupted. Signal lost.'}
                        </p>
                        <button onClick={() => setShowModal(null)} className={styles.primaryBtn}>
                            RETURN TO TERMINAL
                        </button>
                    </div>
                </div>
            )}

            <div className={styles.wrapper}>

                {/* ── HEADER ── */}
                <div className={styles.header}>
                    <Link href="/" className={styles.backBtn}>
                        <ArrowLeft size={18} />
                    </Link>
                    <div className={styles.headerRight}>
                        <h1 className={styles.pageTitle}>THE BRIDGE</h1>
                        <p className={styles.pageSubtitle}>SECURE COMMS CHANNEL</p>
                    </div>
                </div>

                {/* ── TABS ── */}
                <div className={styles.tabs}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setView(tab.id)}
                            className={`${styles.tab} ${view === tab.id ? styles.tabActive : ''}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── TICKET FORM ── */}
                {view === 'form' && (
                    <div className={styles.formCard}>
                        <form onSubmit={handleSubmit} className={styles.formStack}>
                            <div className={styles.inputGrid}>
                                <div className={styles.field}>
                                    <label className={styles.fieldLabel}>Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className={styles.fieldInput}
                                    >
                                        <option value="Complaint">COMPLAINT</option>
                                        <option value="Suggestion">SUGGESTION</option>
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.fieldLabel}>Operator Name</label>
                                    <input
                                        required type="text"
                                        placeholder='.skr domain name'
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className={styles.fieldInput}
                                    />
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label className={styles.fieldLabel}>Reply Email</label>
                                <input
                                    required type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className={styles.fieldInput}
                                />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.fieldLabel}>Subject</label>
                                <input
                                    required type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className={styles.fieldInput}
                                />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.fieldLabel}>Description</label>
                                <textarea
                                    required rows={5}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className={styles.fieldInput}
                                />
                            </div>
                            <button disabled={loading} className={styles.primaryBtn}>
                                {loading
                                    ? <><span className={styles.btnSpinner} /> UPLOADING...</>
                                    : <><Send size={13} /> EXECUTE TRANSMISSION</>}
                            </button>
                        </form>
                    </div>
                )}

                {/* ── HISTORY ── */}
                {view === 'history' && (
                    <div className={styles.historyList}>
                        {history.length === 0 ? (
                            <div className={styles.emptyState}>NO ARCHIVED MESSAGES</div>
                        ) : (
                            history.map(ticket => (
                                <div key={ticket.id} className={styles.historyCard}>
                                    <div className={styles.historyCardTop}>
                                        <span className={styles.typeBadge}>{ticket.type.toUpperCase()}</span>
                                        <span className={styles.dateText}>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className={styles.historyTitle}>{ticket.title}</h3>
                                    <p className={styles.historyDesc}>{ticket.description}</p>
                                    <div className={`${styles.statusChip} ${ticket.status === 'Pending' ? styles.statusPending : styles.statusDone}`}>
                                        ● {ticket.status.toUpperCase()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                <p className={styles.footer}>AUTHORIZED COMMS MODULE // LAAM TERMINAL V.01</p>
            </div>
        </div>
    );
}