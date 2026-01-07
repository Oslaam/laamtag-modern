import { motion, AnimatePresence } from 'framer-motion';

export default function BoxModal({ isOpen, content, onClose }: { isOpen: boolean, content: any, onClose: () => void }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90">
                    <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        className="bg-gradient-to-b from-yellow-400 to-yellow-700 p-1 rounded-[40px] shadow-[0_0_50px_rgba(234,179,8,0.5)]"
                    >
                        <div className="bg-black rounded-[38px] p-10 text-center max-w-sm">
                            <motion.div
                                animate={{ y: [0, -20, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="text-8xl mb-6"
                            >
                                🎁
                            </motion.div>
                            <h2 className="text-3xl font-black italic text-white uppercase mb-2">Special Box</h2>
                            <p className="text-yellow-500 font-bold mb-6 uppercase tracking-widest text-sm">Reactor Overload Reward</p>
                            <div className="bg-white/10 py-4 rounded-2xl mb-8 border border-white/20">
                                <span className="text-4xl font-black text-white">{content}</span>
                            </div>
                            <button onClick={onClose} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase italic">
                                Claim Reward
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}