import { useState } from 'react';
import SeekerGuard from '../components/SeekerGuard';
import GuessGameComponent from '../components/GuessGame';
import SpinGame from '../components/SpinGame';
import LootVault from '../components/LootVault';
import HistoryModal from '../components/HistoryModal';
import { Toaster } from 'react-hot-toast';
import { History } from 'lucide-react';

export default function GamesPage() {
    const [activeGame, setActiveGame] = useState<'GUESS' | 'SPIN'>('GUESS');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    return (
        <SeekerGuard>
            <div className="py-6 px-4 max-w-xl mx-auto">
                <Toaster position="bottom-center" />

                {/* Header Section - 3 Column Layout for perfect centering */}
                <div className="flex justify-between items-start mb-10">
                    <div className="flex-1"></div> {/* Left Spacer */}

                    <div className="text-center flex-[2]">
                        <h1 className="text-4xl font-black italic text-yellow-500 uppercase tracking-tighter">
                            Gaming Terminal
                        </h1>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1">
                            Select Module
                        </p>
                    </div>

                    <div className="flex-1 flex justify-end">
                        <button
                            onClick={() => setIsHistoryOpen(true)}
                            className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-yellow-500 hover:border-yellow-500/50 transition-all group"
                            title="View Master Ledger"
                        >
                            <History size={18} className="group-hover:rotate-[-10deg] transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Claimable Rewards Section */}
                <LootVault />

                <div className="mt-10">
                    {/* Game Selector Tabs */}
                    <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl mb-8">
                        <button
                            onClick={() => setActiveGame('GUESS')}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeGame === 'GUESS'
                                ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.2)]'
                                : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Frequency Jammer
                        </button>
                        <button
                            onClick={() => setActiveGame('SPIN')}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeGame === 'SPIN'
                                ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.2)]'
                                : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            The Reactor
                        </button>
                    </div>

                    {/* Conditional Rendering of Modules */}
                    {activeGame === 'GUESS' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-6">
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest italic">
                                    Cost: 1 TAG Per Attempt
                                </p>
                            </div>

                            <GuessGameComponent />

                            {/* Jammer Rewards Table */}
                            <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-4">
                                <h4 className="text-[10px] font-black uppercase text-gray-500 mb-3 tracking-widest">
                                    Jammer Rewards
                                </h4>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                                        <p className="text-[8px] text-yellow-500 font-bold">EASY</p>
                                        <p className="font-black text-sm">100 L</p>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                                        <p className="text-[8px] text-yellow-500 font-bold">NORMAL</p>
                                        <p className="font-black text-sm">200 L</p>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                                        <p className="text-[8px] text-yellow-500 font-bold">HARD</p>
                                        <p className="font-black text-sm">500 L</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-6">
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest italic">
                                    Cost: 5 TAG Per Spin
                                </p>
                            </div>

                            <SpinGame />

                            {/* Reactor Loot Table */}
                            <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-4">
                                <h4 className="text-[10px] font-black uppercase text-gray-500 mb-3 tracking-widest">
                                    Reactor Loot
                                </h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-4 py-3 bg-black/40 rounded-xl border border-white/5">
                                        <p className="text-[10px] font-black uppercase tracking-tighter">Jackpot</p>
                                        <p className="text-yellow-500 font-black italic">2,500 LAAM</p>
                                    </div>
                                    <div className="flex justify-between items-center px-4 py-3 bg-black/40 rounded-xl border border-white/5">
                                        <p className="text-[10px] font-black uppercase tracking-tighter text-gray-400">Rare Find</p>
                                        <p className="text-white font-black italic">200 LAAM</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Ledger Modal Integration */}
                <HistoryModal
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                />

                {/* Footer Disclaimer */}
                <p className="mt-12 text-center text-[8px] text-gray-600 uppercase font-bold tracking-[0.2em]">
                    Authorized Gaming Module // LAAM Terminal v.01
                </p>
            </div>
        </SeekerGuard>
    );
}