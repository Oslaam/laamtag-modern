import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { useWallet } from '@solana/wallet-adapter-react';
import { Send, Clock, MessageSquare, CheckCircle, XCircle, ArrowLeft, Bot, Copy, Check } from 'lucide-react';
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

    // --- EXISTING TICKET STATES ---
    // Updated to store success/error and the generated ID
    const [showModal, setShowModal] = useState<{ type: 'success' | 'error', id?: string } | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        type: 'Complaint', name: '', email: '', title: '', description: ''
    });

    // 1. SOCKET & HANDSHAKE INITIALIZATION
    useEffect(() => {
        const socketInitializer = async () => {
            // 1. Ping the API to ensure the server-side SocketHandler has executed
            await fetch('/api/socket');

            // 2. Initialize with the correct path and transport
            socket = io({
                path: '/api/socket',
                addTrailingSlash: false,
                transports: ['websocket', 'polling'] // Ensures compatibility
            });

            socket.on('connect', () => {
                console.log('CONNECTED TO VAULT');
            });

            socket.on('receive-message', (data: any) => {
                setChatLog((prev) => [...prev, data]);
            });

            socket.on('connect_error', (err) => {
                console.error("Connection Error:", err.message);
            });
        };
        if (view === 'live') {
            socketInitializer();
            const timer = setTimeout(() => setIsChatReady(true), 3500);
            return () => {
                clearTimeout(timer);
                if (socket) socket.disconnect();
            };
        }
    }, [view]);

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
        if (!finalMessage.trim() || !socket) return;

        const userMsgData = {
            sender: publicKey ? publicKey.toBase58().substring(0, 6) : 'OPERATOR',
            text: finalMessage
        };

        // --- CRITICAL ADDITION ---
        // Add the message to your own UI immediately
        setChatLog((prev) => [...prev, userMsgData]);

        socket.emit('send-message', userMsgData);
        setMessage('');

        // ... (rest of your AI logic)
    };

    const AI_RESPONSES: Record<string, string[]> = {
        staking: [
            "Vault access granted. Current LAAM APY is locked at 12.5%. Proceed to the VAULT tab for staking.",
            "Staking protocols are active. Remember: staking LAAM increases your influence in the ecosystem.",
            "Searching 'Staking'... Data found: 12.5% APY available. Use the VAULT interface to begin."
        ],
        tag: [
            "TAG balance check required. Warning: Long-pressing the spin button deducts 5 TAG per cycle.",
            "TAG protocols: If your TAG reserve hits zero during auto-spin, the sequence will terminate immediately.",
            "Daily Spin active. Be advised: auto-spin requires a positive TAG balance. Running dry halts the mission."
        ],
        ticket: [
            "Analyzing ticket logs... Check the HISTORY tab to track your previous transmissions.",
            "Support tickets are stored in the secure ledger. View your status in the HISTORY section.",
            "Mission history synchronized. All open transmissions are visible in the HISTORY module."
        ],
        default: [
            "Signal received. Data is being processed through the LAAMTAG gateway...",
            "Transmission acknowledged. Searching the databanks for relevant Intel...",
            "Connection stable. Please specify your query (STAKING, TAG, or TICKETS) for faster processing.",
            "Your transmission has been logged. Our agents are monitoring this channel."
        ]
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
                        {!isChatReady ? (
                            <div className={styles.initializingBox}>
                                <Bot size={48} className={styles.botIcon} />
                                <div className={styles.typingWrapper}>
                                    <h3 className={styles.typingText}>INITIALIZING AI HANDSHAKE...</h3>
                                </div>
                                <p className={styles.terminalDesc}>LaamTag (AI) is coming online shortly.</p>
                                <div className={styles.pulseBar}></div>
                            </div>
                        ) : (
                            <div className={styles.chatBox}>
                                <div className={styles.chatMessages}>
                                    <div className={styles.aiMessage}>
                                        <span style={{ color: '#eab308', fontWeight: 'bold' }}>LAAMTAG (AI):</span>
                                        Greetings, Seeker. I am the terminal interface. How can I assist with your mission today?
                                    </div>

                                    {chatLog.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={msg.sender === (publicKey ? publicKey.toBase58().substring(0, 6) : 'OPERATOR')
                                                ? styles.userMessage
                                                : styles.aiMessage
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
                                    {['STAKING HELP', 'TICKET STATUS', 'REWARDS'].map((label) => (
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
                                        placeholder="Enter transmission..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className={styles.chatInput}
                                    />
                                    <button type="submit" className={styles.chatSendBtn}><Send size={18} /></button>
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