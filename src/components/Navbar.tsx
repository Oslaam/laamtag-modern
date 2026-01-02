import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// ADD MULTIPLE ADMIN WALLETS HERE
const ADMIN_WALLETS = [
  "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc",
  "CfRjo855LvAWcviiiq7DdcLz9i5Xqy8Vvnmh95UnL9Ua"
];

export default function Navbar() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);

  // Check if the connected wallet is an admin
  const isAdmin = publicKey && ADMIN_WALLETS.includes(publicKey.toString());

  useEffect(() => {
    const checkPending = async () => {
      if (!isAdmin) return; // Only fetch count if user is admin
      try {
        // Replace the old fetch with this:
        const res = await fetch('https://laamtag-production.up.railway.app/admin/pending', {
          headers: { 'x-admin-wallet': publicKey.toString() }
        });
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.count || 0);
        }
      } catch (err) {
        console.error("Admin check failed", err);
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 30000);
    return () => clearInterval(interval);
  }, [publicKey, isAdmin]);

  return (
    <nav className="flex justify-between items-center max-w-6xl mx-auto p-6 bg-black/50 backdrop-blur-md sticky top-0 z-50">
      <div className="flex gap-8 items-center">
        <Link href="/" className="font-black italic text-yellow-500 text-2xl tracking-tighter hover:scale-105 transition-transform">
          LAAM
        </Link>

        <div className="flex gap-6 items-center border-l border-white/10 pl-6">
          <Link
            href="/leaderboard"
            className="text-[10px] font-black opacity-70 hover:opacity-100 uppercase tracking-[0.2em] transition-all"
          >
            Leaderboard
          </Link>

          {/* ONLY SHOWS FOR ADMINS */}
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              className="relative text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] animate-pulse"
            >
              Terminal
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-3 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <WalletMultiButton />
      </div>
    </nav>
  );
}