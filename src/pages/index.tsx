import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import SeekerGuard from '../components/SeekerGuard';
import AppFooter from '../components/AppFooter';

export default function AppHome() {
  const { publicKey, connected } = useWallet();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const displayName = publicKey 
    ? `${publicKey.toString().slice(0, 4)}.skr` 
    : "SEEKER";

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center p-6">
      <Head>
        <title>LaamTag App | Hub</title>
      </Head>

      {!connected ? (
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-black italic text-yellow-500 uppercase tracking-tighter">
            LAAMTAG HUB
          </h1>
          <p className="text-gray-400 max-w-sm mx-auto">
            This portal is gated. Connect your Seeker Genesis wallet to enter the universe.
          </p>
          <div className="flex justify-center">
            {isClient && <WalletMultiButton />}
          </div>
        </div>
      ) : (
        <SeekerGuard>
          <nav className="w-full max-w-4xl flex justify-between items-center absolute top-8 px-6">
            <h1 className="text-2xl font-black italic tracking-tighter text-yellow-500 uppercase">
              {displayName}
            </h1>
            {isClient && <WalletMultiButton />}
          </nav>

          <div className="max-w-2xl text-center space-y-12 mb-20">
            <div className="space-y-4">
              <h2 className="text-5xl font-black tracking-tighter uppercase italic leading-none">
                Welcome to the <br />
                <span className="text-yellow-500">Seeker Universe</span>
              </h2>
              <p className="text-gray-400 text-lg max-w-md mx-auto">
                Your wallet is verified. Access the minting portal or head to the Quests hub to earn LAAM.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/mint" className="group">
                <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl hover:border-yellow-500 transition-all text-left space-y-4 shadow-2xl">
                  <div className="bg-yellow-500 text-black w-10 h-10 rounded-full flex items-center justify-center font-bold">1</div>
                  <h3 className="text-2xl font-bold">Mint Genesis</h3>
                  <p className="text-sm text-gray-500">Claim your Tag and unlock multipliers.</p>
                </div>
              </Link>

              <Link href="/quests" className="group">
                <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl hover:border-yellow-500 transition-all text-left space-y-4 shadow-2xl">
                  <div className="bg-white text-black w-10 h-10 rounded-full flex items-center justify-center font-bold">2</div>
                  <h3 className="text-2xl font-bold">Quest Hub</h3>
                  <p className="text-sm text-gray-500">Earn LAAM by completing missions.</p>
                </div>
              </Link>
            </div>
          </div>
          <AppFooter />
        </SeekerGuard>
      )}
    </div>
  );
}