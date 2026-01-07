import SeekerGuard from '../components/SeekerGuard';
import GuessGameComponent from '../components/GuessGame';
import { Toaster } from 'react-hot-toast';

export default function GamesPage() {
    return (
        <SeekerGuard>
            <div className="py-6 px-4 max-w-xl mx-auto">
                <Toaster />
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black italic text-yellow-500 uppercase tracking-tighter">Frequency Jammer</h1>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1 italic">
                        Cost: 1 TAG Per Attempt
                    </p>
                </div>

                <GuessGameComponent />

                <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-4">
                    <h4 className="text-[10px] font-black uppercase text-gray-500 mb-2">Rewards</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-black/40 p-2 rounded-lg"><p className="text-[8px] text-yellow-500">EASY</p><p className="font-bold text-xs">100 L</p></div>
                        <div className="bg-black/40 p-2 rounded-lg"><p className="text-[8px] text-yellow-500">NORMAL</p><p className="font-bold text-xs">200 L</p></div>
                        <div className="bg-black/40 p-2 rounded-lg"><p className="text-[8px] text-yellow-500">HARD</p><p className="font-bold text-xs">500 L</p></div>
                    </div>
                </div>
            </div>
        </SeekerGuard>
    );
}