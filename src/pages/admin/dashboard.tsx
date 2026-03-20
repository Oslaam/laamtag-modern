"use client";

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import toast, { Toaster } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import styles from '../../styles/AdminDashboard.module.css';
import {
  CheckCircle2, MessageSquare, ExternalLink, ShieldAlert,
  Clock, XCircle, ChevronLeft, Terminal, Bell, Zap, Send, Gift, Coins, Activity, Users, Trash2, Megaphone, Database, UserCheck
} from 'lucide-react';

const MotionDiv = motion.div as any;

const ADMIN_WALLETS = [
  "E4cHwRYWTznNjTvchSkZVXH8LWqdWbLekVXWjzmite6M",
  "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc"
];

const BROADCAST_TEMPLATES = [
  { label: "TAG_ADJUST", text: "REWARDS_CALIBRATED: Your TAG balance has been adjusted by the operator. Verify your terminal balance." },
  { label: "LAAM_ADJUST", text: "SIGNAL_BOOST: Your LAAM holdings have been updated via manual neural override. Check History." },
  { label: "MAINTENANCE", text: "SYSTEM_NOTICE: Central Node undergoing brief maintenance. Expect minor latency for the next 15 minutes." },
  { label: "NEW_QUEST", text: "NEW_SIGNAL: A high-reward quest has just been uploaded. Initialize transmission to earn rewards." }
];

let socket: any;

export default function AdminDashboard() {
  const { publicKey, signMessage } = useWallet();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'QUESTS' | 'SUPPORT' | 'HISTORY' | 'RAFFLES' | 'ALERTS' | 'CHAT' | 'BROADCAST'>('QUESTS');

  const [chatLog, setChatLog] = useState<any[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeUserCount, setActiveUserCount] = useState(0);

  const [submissions, setSubmissions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [history, setHistory] = useState([]);
  const [raffleHistory, setRaffleHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showSuccessUI, setShowSuccessUI] = useState(false);

  const [broadcastTarget, setBroadcastTarget] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastType, setBroadcastType] = useState<'SYSTEM_NEWS' | 'ADMIN_ADJUST'>('SYSTEM_NEWS');

  // Use refs so socket callbacks always have latest state
  const activeChatUserRef = useRef<string | null>(null);
  activeChatUserRef.current = activeChatUser;

  useEffect(() => {
    if (!publicKey) {
      setCheckingAuth(false);
      return;
    }

    if (!ADMIN_WALLETS.includes(publicKey.toString())) {
      toast.error("UNAUTHORIZED ACCESS");
      router.push('/');
    } else {
      setCheckingAuth(false);
      fetchData();
      socketInitializer();
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [publicKey, router]);

  const socketInitializer = async () => {
    await fetch('/api/socket');
    socket = io({ path: '/api/socket' });

    socket.on('connect', () => {
      socket.emit('agent-join-room', 'admin-room');
    });

    socket.on('user-count-update', (count: number) => {
      setActiveUserCount(count);
    });

    socket.on('new-ticket-notification', (data: any) => {
      toast(`SIGNAL DETECTED: ${data.walletAddress?.slice(0, 6)}`, {
        icon: '📡',
        style: { background: '#111', color: '#a855f7', border: '1px solid #a855f7' }
      });
      // Use ref so we always have latest activeChatUser in socket callback
      if (activeChatUserRef.current === data.walletAddress) {
        setChatLog(prev => [...prev, {
          sender: data.walletAddress,
          text: data.description || data.text,
          isAdmin: false,
          timestamp: new Date().toISOString()
        }]);
      }
      fetchData();
    });

    // Renamed from agent-send-message → user-message-incoming to avoid collision
    socket.on('user-message-incoming', (data: any) => {
      if (activeChatUserRef.current === data.walletAddress) {
        setChatLog(prev => [...prev, {
          ...data,
          isAdmin: false,
          timestamp: data.timestamp || new Date().toISOString()
        }]);
      } else {
        setUnreadCount(prev => prev + 1);
        toast.success(`New Message: ${data.walletAddress?.slice(0, 6)}`);
      }
    });
  };

  const joinUserChat = (walletAddress: string, initialMessage?: string) => {
    setActiveChatUser(walletAddress);
    activeChatUserRef.current = walletAddress;

    if (initialMessage) {
      setChatLog([{
        sender: walletAddress,
        text: initialMessage,
        isAdmin: false,
        timestamp: new Date().toISOString()
      }]);
    } else {
      setChatLog([]);
    }

    socket.emit('agent-join-room', walletAddress);
    toast.success(`BRIDGE_ESTABLISHED: ${walletAddress.slice(0, 8)}`);
  };

  const sendAdminMessage = (text: string) => {
    if (!socket || !text.trim() || !activeChatUser) return;

    const adminMsg = {
      walletAddress: activeChatUser,
      sender: 'OPERATOR',
      text: text,
      isAdmin: true,
      timestamp: new Date().toISOString()
    };

    socket.emit('agent-send-message', adminMsg);
    setChatLog(prev => [...prev, adminMsg]);
  };

  const closeActiveTicket = () => {
    if (!activeChatUser) return;
    socket.emit('close-ticket', activeChatUser);
    toast.error("TICKET_CLOSED_SIGNAL_SENT");
    setActiveChatUser(null);
    activeChatUserRef.current = null;
    setChatLog([]);
  };

  const clearChatLog = () => {
    if (confirm("Wipe all intercepted transmissions from current session?")) {
      setChatLog([]);
      toast.success("LOG_PURGED");
    }
  };

  const sendNeuralBroadcast = async () => {
    if (!broadcastTarget || !broadcastMsg) return toast.error("MISSING_DATA");

    const targets = broadcastTarget
      .split(/[\n,]+/)
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);

    if (targets.length === 0) return toast.error("INVALID_TARGETS");

    toast.loading(`Transmitting to ${targets.length} nodes...`, { id: 'bulk-send' });

    let successCount = 0;

    for (const target of targets) {
      try {
        const res = await fetch('/api/admin/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminAddress: publicKey?.toString(),
            targetAddress: target,
            type: broadcastType,
            message: broadcastMsg
          })
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error(`Failed to send to ${target}`, err);
      }
    }

    toast.dismiss('bulk-send');
    if (successCount === targets.length) {
      toast.success(`ALL_TRANSMISSIONS_SUCCESSFUL (${successCount})`);
      setBroadcastMsg('');
      setBroadcastTarget('');
    } else {
      toast.error(`PARTIAL_SUCCESS: ${successCount}/${targets.length} sent.`);
    }
  };

  useEffect(() => {
    if (activeTab === 'CHAT') setUnreadCount(0);
  }, [activeTab]);

  const fetchData = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const headers = { 'x-admin-wallet': publicKey.toString() };
      const [questRes, ticketRes, historyRes, raffleRes] = await Promise.all([
        fetch('/api/admin/pending', { headers }),
        fetch('/api/admin/tickets', { headers }),
        fetch('/api/admin/history', { headers }),
        fetch('/api/admin/raffle-history', { headers })
      ]);

      const questData = await questRes.json();
      const ticketData = await ticketRes.json();
      const historyData = await historyRes.json();
      const raffleData = await raffleRes.json();

      setSubmissions(questData.submissions || []);
      setTickets(Array.isArray(ticketData) ? ticketData : []);
      setHistory(historyData.history || []);
      setRaffleHistory(raffleData.history || []);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("DATA_DECRYPTION_FAILED");
    } finally {
      setLoading(false);
    }
  };

  const handleQuestAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    if (!publicKey || !signMessage) return toast.error("Connect Wallet!");
    try {
      const message = `Admin action: ${action} submission ${id}`;
      const signature = await signMessage(new TextEncoder().encode(message));
      const res = await fetch('/api/admin/review-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: id, action, signature: bs58.encode(signature),
          address: publicKey.toString(), message
        })
      });

      if (res.ok) {
        if (action === 'APPROVE') {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#eab308', '#ffffff'] });
          setShowSuccessUI(true);
          setTimeout(() => setShowSuccessUI(false), 2000);
        }
        toast.success(`SYSTEM: ${action}_SUCCESS`);
        fetchData();
      }
    } catch (err) {
      toast.error("Signature rejected");
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    if (!publicKey) return;
    try {
      const res = await fetch(`/api/admin/tickets?adminAddress=${publicKey.toString()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, newStatus })
      });
      if (res.ok) {
        toast.success("TICKET_STATUS_UPDATED");
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to update ticket");
    }
  };

  const getCount = (tab: string) => {
    if (tab === 'QUESTS') return submissions.length;
    if (tab === 'SUPPORT') return tickets.filter((t: any) => t.status === 'Pending').length;
    if (tab === 'CHAT') return unreadCount;
    return 0;
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-yellow-500 font-black text-[10px] uppercase tracking-[0.4em]">Verifying Credentials...</p>
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 text-center">
        <h1 className="text-2xl font-black mb-2 text-yellow-500 italic uppercase tracking-[0.3em]">Terminal Gated</h1>
        <p className="text-gray-500 mb-8 max-w-xs text-[10px] uppercase font-bold tracking-widest">Master Key Required</p>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-10 bg-black min-h-screen pb-32 ${styles.adminContainer}`}>
      <Toaster position="bottom-right" />

      <AnimatePresence>
        {showSuccessUI && (
          <MotionDiv
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50 bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-yellow-500/10 p-12 rounded-full border border-yellow-500/50 shadow-[0_0_100px_rgba(234,179,8,0.2)]">
              <CheckCircle2 size={80} className="text-yellow-500" />
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-white/5 pb-10">
          <div className="flex items-center gap-6">
            <Link href="/" className="p-3 bg-zinc-900 border border-white/5 rounded-xl hover:bg-white hover:text-black transition-all group">
              <ChevronLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Terminal size={20} className="text-yellow-500" />
                <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter">ADMIN <span className="text-yellow-500">TERMINAL</span></h1>
              </div>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Verification Node 01 // Secure Connection</p>
            </div>
          </div>
          <WalletMultiButton className="!bg-yellow-500 !text-black !font-black !rounded-xl !h-12 !px-8 hover:!bg-white transition-all" />
        </div>

        <div className="flex flex-wrap gap-2 mb-8 bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5">
          {['QUESTS', 'SUPPORT', 'HISTORY', 'RAFFLES', 'ALERTS', 'CHAT', 'BROADCAST'].map((tab) => {
            const count = getCount(tab);
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`relative flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10' : 'text-zinc-500 hover:text-white'}`}
              >
                {tab}
                {count > 0 && (
                  <span className={`absolute -top-1 -right-1 text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-black animate-pulse ${tab === 'CHAT' ? 'bg-yellow-500' : 'bg-red-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 border border-white/5 rounded-[40px] bg-zinc-900/20">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.2em]">Decrypting_Incoming_Transmissions...</p>
          </div>
        ) : (
          <div className="grid gap-4">

            {/* BROADCAST TAB */}
            {activeTab === 'BROADCAST' && (
              <MotionDiv className={`${styles.glassCard} p-8`}>
                <div className="flex flex-col lg:flex-row gap-10">
                  <div className="lg:w-1/3 space-y-6">
                    <h2 className="text-xl font-black text-yellow-500 italic uppercase">Signal Settings</h2>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 mb-3 uppercase">Transmission Type</p>
                      <div className="space-y-2">
                        <button onClick={() => setBroadcastType('SYSTEM_NEWS')} className={`w-full p-4 rounded-xl text-left border ${broadcastType === 'SYSTEM_NEWS' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' : 'border-white/5 text-zinc-500'}`}>
                          <Megaphone className="inline mr-2" size={16} /> News
                        </button>
                        <button onClick={() => setBroadcastType('ADMIN_ADJUST')} className={`w-full p-4 rounded-xl text-left border ${broadcastType === 'ADMIN_ADJUST' ? 'bg-green-500/10 border-green-500 text-green-500' : 'border-white/5 text-zinc-500'}`}>
                          <Coins className="inline mr-2" size={16} /> Adjustment
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 mb-3 uppercase">Quick Templates</p>
                      <div className="grid grid-cols-2 gap-2">
                        {BROADCAST_TEMPLATES.map(tpl => (
                          <button key={tpl.label} onClick={() => setBroadcastMsg(tpl.text)} className={styles.templateBtn}>
                            {tpl.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lg:w-2/3 space-y-6 border-l border-white/5 pl-0 lg:pl-10">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Wallet(s)</label>
                      <textarea
                        value={broadcastTarget}
                        onChange={(e) => setBroadcastTarget(e.target.value)}
                        placeholder="Paste one or more addresses here... (Separate by comma or new line)"
                        className={`${styles.terminalInput} h-32 mt-2 resize-none`}
                      />
                      <div className="flex justify-between items-center mt-2 px-1">
                        <p className="text-[9px] text-zinc-600 italic uppercase">
                          Status: <span className="text-yellow-500 font-black">{broadcastTarget.split(/[\n,]+/).filter(a => a.trim()).length} Targets Loaded</span>
                        </p>
                        <button onClick={() => setBroadcastTarget('')} className="text-[9px] text-red-500 font-black uppercase hover:underline">Clear List</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Neural Message</label>
                      <textarea
                        value={broadcastMsg}
                        onChange={(e) => setBroadcastMsg(e.target.value)}
                        placeholder="Enter the message for the transmission..."
                        className={`${styles.terminalInput} h-24 mt-2 resize-none`}
                      />
                    </div>
                    <button onClick={sendNeuralBroadcast} className="w-full bg-white text-black py-4 rounded-2xl font-black hover:bg-yellow-500 transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] uppercase italic tracking-widest">
                      Execute Bulk Transmission
                    </button>
                  </div>
                </div>
              </MotionDiv>
            )}

            {/* QUESTS TAB */}
            {activeTab === 'QUESTS' && submissions.map((s: any) => (
              <MotionDiv layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={s.id} className="p-6 border border-zinc-800 rounded-[32px] bg-zinc-900/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-yellow-500/30 transition-all group">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-white font-black text-xl italic uppercase tracking-tight">{s.quest.title}</p>
                    <span className="bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded-md">+{s.quest.reward} LAAM</span>
                  </div>
                  <div className="flex gap-4 mb-4">
                    <p className="text-[10px] text-zinc-500 font-mono">USER: <span className="text-white">{s.userId?.slice(0, 8)}...</span></p>
                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-tighter">TYPE: {s.quest.type?.replace('social_', '')}</span>
                  </div>
                  {s.proofLink && (
                    <div className="mt-2">
                      {s.quest.type === 'social_username' ? (
                        <div className="flex items-center gap-3 bg-black border border-white/5 p-3 rounded-2xl max-w-fit">
                          <span className="text-zinc-500 font-black text-[9px] uppercase tracking-widest italic">Identity:</span>
                          <code className="text-white font-bold text-sm tracking-tight">{s.proofLink.startsWith('@') ? s.proofLink : `@${s.proofLink}`}</code>
                        </div>
                      ) : (
                        <a href={s.proofLink.startsWith('http') ? s.proofLink : `https://${s.proofLink}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-2.5 rounded-xl text-white text-[10px] font-black italic hover:bg-white hover:text-black transition-all uppercase tracking-widest group">
                          Verify Transmission <ExternalLink size={12} className="group-hover:translate-x-1 transition-transform" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => handleQuestAction(s.id, 'REJECT')} className="flex-1 md:flex-none border border-red-500/20 text-red-500 px-8 py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all active:scale-95">Reject</button>
                  <button onClick={() => handleQuestAction(s.id, 'APPROVE')} className="flex-1 md:flex-none bg-white text-black px-8 py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-yellow-500 transition-all active:scale-95">Approve</button>
                </div>
              </MotionDiv>
            ))}

            {/* SUPPORT TAB */}
            {activeTab === 'SUPPORT' && tickets.map((t: any) => (
              <MotionDiv layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={t.id}
                className={`p-6 border rounded-[32px] bg-zinc-900/40 flex flex-col gap-4 transition-all ${t.isAIGenerated ? 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.05)]' : 'border-zinc-800 hover:border-yellow-500/30'}`}>

                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      {t.isAIGenerated && (
                        <span className="bg-purple-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                          <Zap size={8} /> AI_PREPARED
                        </span>
                      )}
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${t.status === 'Pending' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'}`}>
                        {t.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                      <p className="text-white font-black text-lg italic uppercase tracking-tight">{t.subject || 'Support Request'}</p>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-mono mb-3">
                      TICKET_ID: {t.id?.slice(-8)} • USER: {(t.walletAddress || t.userWallet || "Unknown")?.slice(0, 8)}...
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setActiveTab('CHAT');
                        joinUserChat(t.walletAddress || t.userWallet, t.message || t.description);
                      }}
                      className="bg-yellow-500 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-white transition-all flex items-center gap-2">
                      <MessageSquare size={12} /> Live Chat
                    </button>
                    {t.status === 'Pending' && (
                      <button
                        onClick={() => updateTicketStatus(t.id, 'Resolved')}
                        className="bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-green-500 transition-all"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>

                {t.isAIGenerated && t.aiSummary && (
                  <div className="bg-purple-500/5 border border-purple-500/20 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Database size={12} className="text-purple-400" />
                      <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Neural_Analysis_Summary</span>
                    </div>
                    <p className="text-zinc-300 text-xs italic leading-relaxed border-l-2 border-purple-500/50 pl-3">
                      {t.aiSummary}
                    </p>
                    {t.suggestedAction && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase">Suggested Action:</span>
                        <code className="text-[10px] text-purple-300 bg-purple-500/10 px-2 py-1 rounded-md">{t.suggestedAction}</code>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                  <p className="text-zinc-300 text-sm leading-relaxed">{t.message}</p>
                </div>
              </MotionDiv>
            ))}

            {/* CHAT TAB */}
            {activeTab === 'CHAT' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4">Active Channels</h2>
                  {tickets.filter((t: any) => t.status === 'Pending').map((t: any) => (
                    <button
                      key={t.id}
                      onClick={() => joinUserChat(t.walletAddress || t.userWallet)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all ${activeChatUser === (t.walletAddress || t.userWallet) ? 'bg-yellow-500/10 border-yellow-500' : 'bg-zinc-900/40 border-white/5 hover:border-white/20'}`}
                    >
                      <p className="text-white font-black text-xs uppercase italic">{(t.walletAddress || t.userWallet)?.slice(0, 12)}...</p>
                      <p className="text-[9px] text-zinc-500 mt-1 truncate">{t.subject}</p>
                    </button>
                  ))}
                </div>

                <div className="lg:col-span-2">
                  <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 border border-yellow-500/20 rounded-[32px] bg-zinc-900/40">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-black italic uppercase text-white flex items-center gap-2">
                        <Activity className="text-yellow-500" size={20} /> Live Intercept
                      </h2>
                      <div className="flex items-center gap-4">
                        {activeChatUser && (
                          <button onClick={closeActiveTicket} className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all">
                            <XCircle size={12} />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Close_Signal</span>
                          </button>
                        )}
                        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full">
                          <Users size={12} className="text-yellow-500" />
                          <span className="text-[10px] text-yellow-500 font-black uppercase tracking-tighter">{activeUserCount} Nodes Active</span>
                        </div>
                      </div>
                    </div>

                    <div className={`h-[450px] overflow-y-auto bg-black/50 rounded-2xl p-6 mb-4 border border-white/5 font-mono text-[12px] ${styles.chatLogScroll}`}>
                      {!activeChatUser ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-20">
                          <UserCheck size={40} className="mb-4" />
                          <p className="italic uppercase tracking-widest text-[10px]">Select a node to begin interception...</p>
                        </div>
                      ) : chatLog.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full opacity-20">
                          <MessageSquare size={40} className="mb-4" />
                          <p className="italic uppercase tracking-widest text-[10px]">Connected to {activeChatUser.slice(0, 8)}... Waiting for signals</p>
                        </div>
                      )}
                      {chatLog.map((msg, i) => (
                        <div key={i} className={`mb-3 flex flex-col ${msg.isAdmin ? 'items-end' : 'items-start'}`}>
                          <div className={`${styles.messageBubble} p-3 rounded-2xl border ${msg.isAdmin ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 'bg-white/5 border-white/10 text-white'}`}>
                            <p className="text-[10px] opacity-50 mb-1 font-black uppercase tracking-tighter">
                              {msg.sender?.slice(0, 8)} • {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                            <p className="text-sm">{msg.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        disabled={!activeChatUser}
                        type="text"
                        placeholder={activeChatUser ? `Message ${activeChatUser.slice(0, 8)}...` : "Select a channel first..."}
                        className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-4 text-sm outline-none focus:border-yellow-500/50 text-white font-mono disabled:opacity-50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            sendAdminMessage(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <button
                        disabled={!activeChatUser}
                        onClick={(e) => {
                          const input = (e.currentTarget.previousSibling as HTMLInputElement);
                          sendAdminMessage(input.value);
                          input.value = '';
                        }}
                        className="bg-yellow-500 text-black px-6 rounded-xl font-black uppercase text-[10px] hover:bg-white transition-all disabled:opacity-50"
                      >
                        Transmit
                      </button>
                    </div>
                  </MotionDiv>
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'HISTORY' && history.map((h: any) => (
              <div key={h.id} className="p-5 border border-white/5 rounded-2xl bg-zinc-900/20 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-zinc-300 font-black italic uppercase tracking-tight">{h.quest?.title}</p>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${h.status === 'APPROVED' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{h.status}</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 font-mono">NODE: {h.user?.walletAddress?.slice(0, 6)}... • {new Date(h.updatedAt).toLocaleString()}</p>
                </div>
                {h.status === 'APPROVED' ? <CheckCircle2 className="text-green-500/20" size={20} /> : <XCircle className="text-red-500/20" size={20} />}
              </div>
            ))}

            {(activeTab === 'QUESTS' ? submissions.length : activeTab === 'SUPPORT' ? tickets.length : 0) === 0 && !['RAFFLES', 'ALERTS', 'CHAT', 'HISTORY', 'BROADCAST'].includes(activeTab) && (
              <div className="text-center py-32 border-2 border-dashed border-zinc-900 rounded-[40px] bg-zinc-900/5">
                <ShieldAlert className="mx-auto text-zinc-800 mb-4" size={40} />
                <p className="text-zinc-600 font-black italic uppercase tracking-[0.5em] text-[10px]">Terminal clear // No transmissions found</p>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}