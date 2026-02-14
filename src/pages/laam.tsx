import Head from 'next/head';
import { DomainRegister } from '../components/DomainRegister';
import { DomainLookup } from '../components/DomainLookup';

export default function LaamPage() {
    return (
        <div className="main-content min-h-screen bg-[#0a0a0a] overflow-hidden">
            <Head>
                <title>LAAMTAG | SYSTEM_REGISTRY</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <div className="content-wrapper max-w-4xl mx-auto px-6 py-16 md:py-24">
                {/* TOP STATUS ALERT */}
                <div className="flex justify-center mb-10">
                    <div className="flex items-center gap-3 px-5 py-2 bg-[#eab308]/5 border border-[#eab308]/20 rounded-full backdrop-blur-md">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#eab308] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#eab308]"></span>
                        </span>
                        <span className="text-[#eab308] text-[9px] font-black uppercase tracking-[0.3em]">
                            System Online // v2.0.4 - Protocol Ready
                        </span>
                    </div>
                </div>

                {/* HERO SECTION */}
                <div className="flex flex-col items-center text-center mb-16">
                    <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase mb-4 italic leading-none">
                        DOMAIN <span className="text-[#eab308] drop-shadow-[0_0_20px_rgba(234,179,8,0.3)]">REGISTRY</span>
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="h-[1px] w-8 bg-white/10" />
                        <p className="text-white/30 font-mono text-[10px] tracking-[0.5em] uppercase">
                            Identity layer for the LAAM ecosystem
                        </p>
                        <div className="h-[1px] w-8 bg-white/10" />
                    </div>
                </div>

                {/* REGISTRATION CORE */}
                <div className="relative">
                    <div className="absolute -inset-4 bg-[#eab308]/5 blur-3xl rounded-full opacity-50 pointer-events-none" />
                    <DomainRegister />
                    <DomainLookup />
                </div>

                {/* FOOTER STATUS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    <div className="p-6 rounded-3xl bg-white/[0.01] border border-white/5 backdrop-blur-sm transition-all hover:bg-white/[0.03]">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-3 bg-[#eab308]" />
                            <h4 className="text-[#eab308] font-black text-[10px] uppercase tracking-[0.2em]">Protocol Status</h4>
                        </div>
                        <p className="text-white/40 text-[10px] leading-relaxed font-mono uppercase italic">
                            [NOTICE]: All name records are permanent. Metadata is hosted on-chain via Metaplex for maximum decentralization.
                        </p>
                    </div>

                    <div className="p-6 rounded-3xl bg-white/[0.01] border border-white/5 backdrop-blur-sm flex items-center justify-between group transition-all hover:border-[#eab308]/20">
                        <span className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Integrity Check</span>
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-mono text-white/40">NODE_01</span>
                            <span className="px-4 py-1.5 bg-green-500/10 text-green-400 text-[9px] font-black rounded-lg border border-green-500/20 uppercase shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                                Verified
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}