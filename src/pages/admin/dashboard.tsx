"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import toast, { Toaster } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, MessageSquare, ExternalLink, ShieldAlert, Clock, XCircle } from 'lucide-react';

const MotionDiv = motion.div as any;
const MotionSvg = motion.svg as any;

const ADMIN_WALLETS = [
  "E4cHwRYWTznNjTvchSkZVXH8LWqdWbLekVXWjzmite6M",
  "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc"
];

export default function AdminDashboard() {
  const { publicKey, signMessage } = useWallet();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'QUESTS' | 'SUPPORT' | 'HISTORY'>('QUESTS');
  const [submissions, setSubmissions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showSuccessUI, setShowSuccessUI] = useState(false);

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
    }
  }, [publicKey, router]);

  const fetchData = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const headers = { 'x-admin-wallet': publicKey.toString() };
      
      // Quests
      const questRes = await fetch('/api/admin/pending', { headers });
      const questData = await questRes.json();
      setSubmissions(questData.submissions || []);

      // Tickets
      const ticketRes = await fetch('/api/admin/tickets', { headers });
      const ticketData = await ticketRes.json();
      setTickets(Array.isArray(ticketData) ? ticketData : []);

      // History
      const historyRes = await fetch('/api/admin/history', { headers });
      const historyData = await historyRes.json();
      setHistory(historyData.history || []);

    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load terminal data");
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
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#eab308', '#ffffff', '#22c55e'] });
          setShowSuccessUI(true);
          setTimeout(() => setShowSuccessUI(false), 3000);
        }
        toast.success(`Quest ${action === 'APPROVE' ? 'Approved' : 'Rejected'}!`);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Action failed");
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
        toast.success("Ticket Status Updated");
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to update ticket");
    }
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
        <p className="text-gray-500 mb-8 max-w-xs text-[10px] uppercase font-bold tracking-widest">Master Key Required for Access</p>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className="p-10 bg-black min-h-screen text-white font-sans overflow-hidden pb-32">
      <Toaster position="bottom-right" />

      <AnimatePresence>
        {showSuccessUI && (
          <MotionDiv
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <div className="bg-yellow-500/10 backdrop-blur-xl p-12 rounded-full border border-yellow-500/50 shadow-[0_0_100px_rgba(234,179,8,0.3)]">
              <MotionSvg
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5 }}
                className="w-24 h-24 text-yellow-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </MotionSvg>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-10">
          <div className="flex items-center gap-6">
            <Link href="/" className="group flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl hover:bg-white hover:text-black transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-widest">Close Terminal</span>
            </Link>
            <div className="h-8 w-[1px] bg-white/10" />
            <div>
              <h1 className="text-3xl font-black italic text-yellow-500 uppercase tracking-tighter">Terminal</h1>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Verification Node 01</p>
            </div>
          </div>
          <WalletMultiButton />
        </div>

        <div className="flex gap-4 mb-8 bg-gray-900/30 p-2 rounded-2xl border border-white/5">
          <button onClick={() => setActiveTab('QUESTS')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'QUESTS' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-white'}`}>
            Pending ({submissions.length})
          </button>
          <button onClick={() => setActiveTab('SUPPORT')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SUPPORT' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-white'}`}>
            Tickets ({tickets.length})
          </button>
          <button onClick={() => setActiveTab('HISTORY')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'HISTORY' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-white'}`}>
            History ({history.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-gray-500 font-mono text-[10px] uppercase tracking-widest">
            <div className="w-3 h-3 border border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            Decrypting Pending Packets...
          </div>
        ) : (
          <div className="grid gap-4">
            {activeTab === 'QUESTS' && (
              submissions.map((s: any) => (
                <MotionDiv layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} key={s.id} className="p-6 border border-gray-800 rounded-3xl bg-gray-900/40 flex justify-between items-center hover:border-yellow-500/30 transition-all group">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-white font-black text-xl italic uppercase tracking-tight">{s.quest.title}</p>
                      <span className="bg-yellow-500/10 text-yellow-500 text-[10px] font-black px-2 py-0.5 rounded-md">+{s.quest.reward} LAAM</span>
                    </div>
                    <div className="flex gap-2 mb-3">
                      <p className="text-[10px] text-gray-500 font-mono bg-black/40 px-2 py-1 rounded">USER: {s.userId.slice(0, 4)}...{s.userId.slice(-4)}</p>
                      <span className="text-[9px] font-black bg-white/5 border border-white/10 px-2 py-1 rounded text-gray-400 uppercase tracking-tighter">Type: {s.quest.type.replace('social_', '')}</span>
                    </div>
                    {s.proofLink && (
                      <div className="mt-2">
                        {s.quest.type === 'social_username' ? (
                          <div className="flex items-center gap-2 bg-yellow-500/5 border border-yellow-500/20 p-3 rounded-xl max-w-fit">
                            <span className="text-yellow-500 font-black text-[10px] uppercase tracking-widest">Username:</span>
                            <code className="text-white font-bold text-sm">{s.proofLink.startsWith('@') ? s.proofLink : `@${s.proofLink}`}</code>
                            <button onClick={() => { navigator.clipboard.writeText(s.proofLink); toast.success("Copied!"); }} className="ml-4 text-[9px] bg-white/10 px-2 py-1 rounded hover:bg-white/20 transition-all">Copy</button>
                          </div>
                        ) : (
                          <a href={s.proofLink.startsWith('http') ? s.proofLink : `https://${s.proofLink}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-xl text-cyan-400 text-[10px] font-black italic hover:bg-cyan-500 hover:text-white transition-all uppercase tracking-widest group">
                            Verify Social Link <ExternalLink size={12} className="group-hover:translate-x-1 transition-transform" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 ml-6">
                    <button onClick={() => handleQuestAction(s.id, 'REJECT')} className="border border-red-500/30 text-red-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all active:scale-95">Reject</button>
                    <button onClick={() => handleQuestAction(s.id, 'APPROVE')} className="bg-white text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-yellow-500 transition-all active:scale-95 shadow-lg shadow-white/5">Approve</button>
                  </div>
                </MotionDiv>
              ))
            )}

            {activeTab === 'HISTORY' && (
              history.map((h: any) => (
                <div key={h.id} className="p-6 border border-white/5 rounded-3xl bg-gray-900/20 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
                   <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-gray-300 font-bold italic uppercase tracking-tight">{h.quest.title}</p>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${h.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{h.status}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono">USER: {h.user.walletAddress.slice(0, 6)}... • {new Date(h.updatedAt).toLocaleString()}</p>
                  </div>
                  {h.status === 'APPROVED' ? <CheckCircle2 className="text-green-500/30" size={24} /> : <XCircle className="text-red-500/30" size={24} />}
                </div>
              ))
            )}

            {activeTab === 'SUPPORT' && (
              tickets.map((t: any) => (
                <MotionDiv layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={t.id} className="p-6 border border-gray-800 rounded-3xl bg-gray-900/40 flex flex-col md:flex-row justify-between gap-6 hover:border-yellow-500/30 transition-all">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-[9px] font-black px-2 py-1 rounded ${t.type === 'Complaint' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'} uppercase`}>{t.type}</span>
                      <span className="text-gray-600 text-[10px] font-mono">{new Date(t.createdAt).toLocaleString()}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white italic">{t.title}</h3>
                    <p className="text-gray-400 text-sm mb-4 bg-black/40 p-4 rounded-2xl border border-white/5">{t.description}</p>
                    <div className="flex flex-wrap gap-4 text-[9px] uppercase font-black text-gray-500 tracking-widest">
                      <p>Name: <span className="text-white">{t.name}</span></p>
                      <p>Wallet: <span className="text-yellow-500 font-mono">{t.walletAddress.slice(0, 6)}...</span></p>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center gap-2 min-w-[160px]">
                    {t.status === 'Pending' ? (
                      <button onClick={() => updateTicketStatus(t.id, 'Resolved')} className="bg-yellow-500 text-black py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"><CheckCircle2 size={14} /> Resolve</button>
                    ) : (
                      <div className="bg-green-500/10 text-green-500 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-center border border-green-500/20">Resolved</div>
                    )}
                    <a href={`mailto:${t.email}`} className="bg-white/5 text-white border border-white/10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-center hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2"><MessageSquare size={14} /> Reply</a>
                  </div>
                </MotionDiv>
              ))
            )}

            {(activeTab === 'QUESTS' ? submissions.length : activeTab === 'SUPPORT' ? tickets.length : history.length) === 0 && (
              <div className="text-center py-20 border-2 border-dashed border-gray-900 rounded-[40px]">
                <p className="text-gray-600 font-black italic uppercase tracking-widest text-[10px]">Terminal clear. No pending transmissions.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}