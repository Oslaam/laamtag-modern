import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import SeekerGuard from '../components/SeekerGuard';

export default function AppHome() {
  const { connected } = useWallet();

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <Head>
        <title>LaamTag App | Hub</title>
      </Head>

      {!connected ? (
        <div className="text-center space-y-6 py-20">
          <h1 className="text-6xl font-black italic text-yellow-500 uppercase tracking-tighter brand-text-glow">
            LAAMTAG<br />HUB
          </h1>
          <p className="text-gray-400 max-w-xs mx-auto text-sm font-bold uppercase tracking-widest opacity-60">
            System Locked. Connect Seeker Wallet to Initialize.
          </p>
        </div>
      ) : (
        <SeekerGuard>
          <div className="w-full max-w-xl text-center space-y-8 py-10">
            <div className="space-y-2 py-6">
              <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">
                Welcome <br />
                <span className="text-yellow-500 brand-text-glow">Seeker Universe</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Link href="/mint">
                <div className="glass-card p-6 text-left hover:border-yellow-500 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-black uppercase italic group-hover:text-yellow-500 transition-colors">Mint Genesis</h3>
                      <p className="text-xs text-gray-500 font-bold uppercase mt-1">Claim Tag & Unlock Multipliers</p>
                    </div>
                    <div className="bg-yellow-500 text-black px-3 py-1 rounded-md font-black text-[10px]">01</div>
                  </div>
                </div>
              </Link>

              <Link href="/quests">
                <div className="glass-card p-6 text-left hover:border-yellow-500 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-black uppercase italic group-hover:text-yellow-500 transition-colors">Quest Hub</h3>
                      <p className="text-xs text-gray-500 font-bold uppercase mt-1">Complete Missions to earn LAAM</p>
                    </div>
                    <div className="bg-white text-black px-3 py-1 rounded-md font-black text-[10px]">02</div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </SeekerGuard>
      )}
    </div>
  );
}