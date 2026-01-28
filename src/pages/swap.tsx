import React from 'react';
import Head from 'next/head';
import { Hammer, Timer } from 'lucide-react'; // Optional icons

// We keep the import here but comment it out so you don't lose the reference
// import SwapUI from '../components/Swap'; 

export default function SwapPage() {
    return (
        <>
            <Head>
                <title>Swap | LaamTag Modern</title>
                <meta name="description" content="Swap tokens on Solana" />
            </Head>

            <main className="min-h-screen bg-black flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center space-y-6">
                    {/* Animated Icon Container */}
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full animate-pulse"></div>
                        <div className="relative border-2 border-yellow-500 rounded-2xl p-6 bg-black">
                            <span className="text-5xl">⚡</span>
                        </div>
                    </div>

                    {/* Bold Text Content */}
                    <div>
                        <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
                            Swap <span className="text-yellow-500 underline decoration-4">Paused</span>
                        </h1>
                        <p className="mt-4 text-gray-500 font-medium uppercase tracking-widest text-xs">
                            Interface Maintenance in Progress
                        </p>
                    </div>

                    {/* Progress Bar Decor */}
                    <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-yellow-500 h-full w-2/3 shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
                    </div>

                    <p className="text-zinc-400 text-sm leading-relaxed px-6">
                        We're currently refactoring the DEX aggregator for better execution speeds.
                        Check back soon for a smoother Seeker experience.
                    </p>

                    {/* Back to Hub Button */}
                    <div className="pt-4">
                        <a
                            href="/"
                            className="inline-block px-8 py-3 bg-white text-black font-bold uppercase text-xs rounded hover:bg-yellow-500 transition-colors"
                        >
                            Return to Hub
                        </a>
                    </div>
                </div>
            </main>
        </>
    );
}