'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  LayoutDashboard,
  Sword,
  Trophy,
  Shield,
  Terminal,
  Zap,
  ChevronRight
} from 'lucide-react';

// Admin access list migrated from Navbar
const ADMIN_WALLETS = [
  "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc",
  "CfRjo855LvAWcviiiq7DdcLz9i5Xqy8Vvnmh95UnL9Ua"
];

export default function Sidebar() {
  const pathname = usePathname();
  const { publicKey } = useWallet();
  const [activeQuests, setActiveQuests] = useState(0);
  const [pendingAdminCount, setPendingAdminCount] = useState(0);
  // 1. ADDED USERNAME STATE
  const [username, setUsername] = useState('SEEKER');

  const isAdmin = publicKey && ADMIN_WALLETS.includes(publicKey.toString());

  // Fetch Quest Counts & Admin Pending Notifications
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Quest Count
        const qRes = await fetch('/api/quests/count');
        const qData = await qRes.json();
        setActiveQuests(qData.count || 0);

        // 2. FETCH USER DATA FOR USERNAME
        if (publicKey) {
          const userRes = await fetch(`/api/user/${publicKey.toString()}`);
          const userData = await userRes.json();
          if (userData.username) setUsername(userData.username);
        }

        // Admin Count (if applicable)
        if (isAdmin) {
          const aRes = await fetch('/api/admin/pending', {
            headers: { 'x-admin-wallet': publicKey.toString() }
          });
          if (aRes.ok) {
            const aData = await aRes.json();
            setPendingAdminCount(aData.count || 0);
          }
        }
      } catch (err) {
        console.error("Sidebar sync failed", err);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [publicKey, isAdmin]);

  const navItems = [
    { name: 'Hub', href: '/', icon: LayoutDashboard },
    { name: 'Quests', href: '/quests', icon: Sword, badge: activeQuests },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { name: 'My Vault', href: '/profile', icon: Shield },
  ];

  return (
    <div className="w-64 bg-[#050505] h-screen p-6 border-r border-white/5 hidden md:flex flex-col">
      {/* Branding */}
      <div className="mb-10 px-2">
        <h1 className="text-2xl font-black italic text-yellow-500 tracking-tighter">
          LAAM<span className="text-white text-[10px] not-italic ml-1 opacity-50 font-bold uppercase tracking-widest">v2.0</span>
        </h1>
        {/* 3. ADDED AGENT DISPLAY UNDER LOGO */}
        <p className="text-white/30 text-[9px] font-black uppercase mt-1 tracking-widest">
          AGENT: <span className="text-yellow-500">{username}</span>
        </p>
      </div>

      <h2 className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em] mb-6 px-2">
        Navigation
      </h2>

      <nav className="space-y-2 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between p-3 rounded-xl transition-all group ${isActive
                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className={isActive ? 'text-yellow-500' : 'text-gray-600 group-hover:text-gray-300'} />
                <span className="font-black uppercase text-xs italic tracking-tighter">{item.name}</span>
              </div>

              {item.badge ? (
                <span className="bg-yellow-500 text-black text-[9px] px-1.5 py-0.5 rounded font-black">
                  {item.badge}
                </span>
              ) : (
                <span /> // Empty span to maintain layout structure
              )}
            </Link>
          );
        })}

        {/* ADMIN TERMINAL LINK */}
        {isAdmin && (
          <Link
            href="/admin/dashboard"
            className="flex items-center justify-between p-3 rounded-xl transition-all group border border-dashed border-red-900/30 hover:bg-red-950/20 mt-4"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Terminal size={18} className="text-red-500" />
                {pendingAdminCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </div>
              <span className="font-black uppercase text-xs italic tracking-tighter text-red-500">Terminal</span>
            </div>
            {pendingAdminCount > 0 && (
              <span className="text-[9px] font-black text-red-500">{pendingAdminCount}</span>
            )}
          </Link>
        )}
      </nav>

      {/* Pro Tip Card */}
      <div className="mt-auto">
        <div className="bg-yellow-500/5 p-4 rounded-2xl border border-yellow-500/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:rotate-12 transition-transform">
            <Zap size={32} className="text-yellow-500" />
          </div>
          <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest mb-1">Status Pro-Tip</p>
          <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
            Complete <span className="text-white">Limited</span> quests first to maximize your LAAM yields.
          </p>
        </div>
      </div>
    </div>
  );
}