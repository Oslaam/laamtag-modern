import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { useWallet } from '@solana/wallet-adapter-react';
import { Send, Clock, MessageSquare, CheckCircle, XCircle, ArrowLeft, Bot, Copy, Check, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import styles from '../styles/Contact.module.css';

// Variable to hold the socket instance outside the component render cycle
let socket: Socket | undefined;

export default function ContactPage() {
    const { publicKey } = useWallet();
    const [view, setView] = useState<'form' | 'history' | 'live'>('form');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // --- LIVE CHAT STATES ---
    const [isChatReady, setIsChatReady] = useState(false);
    const [message, setMessage] = useState('');
    const [chatLog, setChatLog] = useState<{ sender: string, text: string }[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [isAgentConnected, setIsAgentConnected] = useState(false);

    // Updated to store success/error and the generated ID
    const [showModal, setShowModal] = useState<{ type: 'success' | 'error', id?: string } | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        type: 'Complaint', name: '', email: '', title: '', description: ''
    });

    // 1. SOCKET & HANDSHAKE INITIALIZATION
    useEffect(() => {
        const socketInitializer = async () => {
            await fetch('/api/socket');

            socket = io({
                path: '/api/socket',
                addTrailingSlash: false,
                transports: ['websocket', 'polling']
            });

            socket.on('connect', () => {
                if (publicKey) {
                    const walletAddr = publicKey.toBase58();
                    socket?.emit('join-private-room', walletAddr);
                }
            });

            socket.on('agent-joined', () => {
                setIsAgentConnected(true);
                setChatLog(prev => [...prev, { sender: 'SYSTEM', text: 'An authorized agent has joined the channel.' }]);
            });

            socket.on('agent-send-message', (data: any) => {
                setChatLog((prev) => [...prev, { sender: 'SUPPORT', text: data.text }]);
            });

            socket.on('ticket-closed', () => {
                alert("This session has been closed by support. Transmission cleared.");
                setChatLog([]);
                setIsAgentConnected(false);
                setView('form');
            });

            socket.on('connect_error', (err) => {
                console.error("Connection Error:", err.message);
            });
        };

        if (view === 'live') {
            socketInitializer();
            const timer = setTimeout(() => setIsChatReady(true), 2000);
            return () => {
                clearTimeout(timer);
                if (socket) socket.disconnect();
            };
        }
    }, [view, publicKey]);

    // Auto-scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatLog, isAiTyping]);

    // History fetcher
    useEffect(() => {
        if (publicKey && view === 'history') {
            axios.get(`/api/user/messages?address=${publicKey.toBase58()}`)
                .then(res => setHistory(res.data))
                .catch(err => console.error("History error", err));
        }
    }, [publicKey, view]);

    // --- HELPERS ---
    const generateTicketId = () => {
        const prefix = "TX";
        const randomHex = Math.random().toString(16).toUpperCase().substring(2, 6);
        const year = new Date().getFullYear();
        return `${prefix}-${randomHex}-${year}`;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // --- HANDLERS ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const ticketId = generateTicketId();

        try {
            await axios.post('/api/user/contact', {
                ...formData,
                ticketId,
                walletAddress: publicKey?.toBase58() || 'Anonymous'
            });
            setShowModal({ type: 'success', id: ticketId });
            setFormData({ type: 'Complaint', name: '', email: '', title: '', description: '' });
        } catch (err) {
            setShowModal({ type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const sendChatMessage = (e?: React.FormEvent, customMsg?: string) => {
        if (e) e.preventDefault();

        const finalMessage = customMsg || message;
        if (!finalMessage.trim() || !socket || !publicKey) return;

        const userMsgData = {
            sender: 'USER', // Simpler for log check
            walletAddress: publicKey.toBase58(),
            text: finalMessage
        };

        setChatLog((prev) => [...prev, userMsgData]);

        // TRIGGER "TYPING" FEELING
        if (!isAgentConnected) {
            setIsAiTyping(true);
            setTimeout(() => setIsAiTyping(false), 2500);
        }

        socket.emit('user-send-message', userMsgData);
        setMessage('');
    };

    return (
        <div className={styles.mainContent}>
            <Head><title>LAAMTAG | The Bridge</title></Head>

            {/* TRANSMISSION MODAL */}
            {showModal && (
                <div className={styles.overlay}>
                    <div className={styles.terminalModal}>
                        {showModal.type === 'success' ? (
                            <CheckCircle size={50} color="#eab308" />
                        ) : (
                            <XCircle size={50} color="#ef4444" />
                        )}
                        <h2 className={styles.modalTitle}>
                            {showModal.type === 'success' ? 'TRANSMITTED' : 'FAILED'}
                        </h2>

                        {showModal.type === 'success' && showModal.id && (
                            <div className={styles.idContainer}>
                                <p className={styles.idLabel}>REFERENCE ID</p>
                                <div className={styles.idRow}>
                                    <code className={styles.idCode}>{showModal.id}</code>
                                    <button
                                        onClick={() => copyToClipboard(showModal.id!)}
                                        className={styles.copyBtn}
                                        title="Copy ID"
                                    >
                                        {copied ? <Check size={16} color="#22c55e" /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <p className={styles.terminalDesc}>
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

            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <Link href="/" className={styles.backButton}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div style={{ textAlign: 'right' }}>
                        <h1 className={styles.pageTitle}>THE BRIDGE</h1>
                        <p className={styles.terminalDescSmall}>SECURE COMMS CHANNEL</p>
                    </div>
                </div>

                <div className={styles.tabSelector}>
                    <button onClick={() => setView('form')} className={`${styles.tabButton} ${view === 'form' ? styles.activeTab : ''}`}><Send size={14} /> TICKET</button>
                    <button onClick={() => setView('live')} className={`${styles.tabButton} ${view === 'live' ? styles.activeTab : ''}`}><MessageSquare size={14} /> LIVE CHAT</button>
                    <button onClick={() => setView('history')} className={`${styles.tabButton} ${view === 'history' ? styles.activeTab : ''}`}><Clock size={14} /> HISTORY</button>
                </div>

                {view === 'live' && (
                    <div className={styles.liveChatContainer}>

                        {/* --- STATUS BAR INDICATOR --- */}
                        <div className={styles.chatHeaderStatus} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div className={styles.statusBadge}>
                                <span className={`${styles.statusDot} ${isAgentConnected ? styles.statusDotLive : ''}`}></span>
                                <span>{isAgentConnected ? 'AGENT CONNECTED' : 'SIGNAL BROADCASTING...'}</span>
                            </div>
                            {isAgentConnected && <ShieldCheck size={16} color="#22c55e" />}
                        </div>

                        {!isChatReady ? (
                            /* INITIALIZING STATE */
                            <div className={styles.initializingBox}>
                                <Bot size={48} className={styles.botIcon} />
                                <div className={styles.typingWrapper}>
                                    <h3 className={styles.typingText}>SECURE HANDSHAKE...</h3>
                                </div>
                                <div className={styles.pulseBar}></div>
                            </div>
                        ) : (
                            /* ACTIVE CHAT INTERFACE */
                            <div className={styles.chatBox}>
                                <div className={styles.chatMessages}>
                                    <div className={styles.aiMessage}>
                                        <span style={{ color: '#eab308', fontWeight: 'bold' }}>SYSTEM:</span>
                                        {isAgentConnected
                                            ? " Encryption active. Agent is online."
                                            : " Signal broadcasted. Waiting for an available agent..."
                                        }
                                    </div>

                                    {chatLog.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={msg.sender === 'SUPPORT' || msg.sender === 'SYSTEM'
                                                ? styles.aiMessage
                                                : styles.userMessage
                                            }
                                        >
                                            {msg.text}
                                        </div>
                                    ))}

                                    {isAiTyping && (
                                        <div className={styles.aiTypingIndicator}>
                                            <span className={styles.typingDot}></span>
                                            <span className={styles.typingDot}></span>
                                            <span className={styles.typingDot}></span>
                                        </div>
                                    )}

                                    <div ref={chatEndRef} />
                                </div>

                                <div className={styles.quickActions}>
                                    {['STAKING', 'REWARDS', 'I NEED HELP'].map((label) => (
                                        <button
                                            key={label}
                                            onClick={() => sendChatMessage(undefined, label)}
                                            className={styles.actionBadge}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                <form onSubmit={sendChatMessage} className={styles.chatInputArea}>
                                    <input
                                        type="text"
                                        placeholder={isChatReady ? "Enter transmission..." : "Connecting..."}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className={styles.chatInput}
                                        disabled={!isChatReady}
                                    />
                                    <button
                                        type="submit"
                                        className={styles.chatSendBtn}
                                        disabled={!isChatReady}
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                {view === 'form' && (
                    <div className={styles.terminalCardLarge}>
                        <form onSubmit={handleSubmit} className={styles.formStack}>
                            <div className={styles.inputGrid}>
                                <div className={styles.inputField}>
                                    <label>TYPE</label>
                                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                        <option value="Complaint">COMPLAINT</option>
                                        <option value="Suggestion">SUGGESTION</option>
                                    </select>
                                </div>
                                <div className={styles.inputField}>
                                    <label>OPERATOR NAME</label>
                                    <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                            </div>
                            <div className={styles.inputField}>
                                <label>REPLY EMAIL</label>
                                <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className={styles.inputField}>
                                <label>SUBJECT</label>
                                <input required type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                            </div>
                            <div className={styles.inputField}>
                                <label>DESCRIPTION</label>
                                <textarea required rows={5} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <button disabled={loading} className={styles.primaryBtn}>
                                {loading ? "UPLOADING..." : "EXECUTE TRANSMISSION"}
                            </button>
                        </form>
                    </div>
                )}

                {view === 'history' && (
                    <div className={styles.historyStack}>
                        {history.length === 0 ? (
                            <div className={styles.emptyHistory}>NO ARCHIVED MESSAGES</div>
                        ) : (
                            history.map((ticket) => (
                                <div key={ticket.id} className={styles.terminalCard}>
                                    <div className={styles.cardHeader}>
                                        <span className={styles.typeBadge}>{ticket.type.toUpperCase()}</span>
                                        <span className={styles.dateText}>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className={styles.cardTitle}>{ticket.title}</h3>
                                    <p className={styles.terminalDesc}>{ticket.description}</p>
                                    <div className={`${styles.statusText} ${ticket.status === 'Pending' ? styles.statusPending : styles.statusSuccess}`}>
                                        STATUS: {ticket.status.toUpperCase()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                <p className={styles.footerText}>
                    AUTHORIZED COMMS MODULE // LAAM TERMINAL V.01
                </p>
            </div>
        </div>
    );
}