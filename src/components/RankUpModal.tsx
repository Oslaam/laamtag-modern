import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

export default function RankUpModal({ isOpen, newRank, onClose }: any) {
  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#C0C0C0', '#00FFFF']
      });
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
          <motion.div 
            initial={{ scale: 0.5, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            className={`p-10 rounded-[40px] border-2 border-white/20 text-center ${newRank.bg}`}
          >
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/50 mb-2">New Rank Unlocked</h2>
            <h1 className={`text-6xl font-black italic uppercase ${newRank.color} mb-6`}>
              {newRank.name}
            </h1>
            <button 
              onClick={onClose}
              className="bg-white text-black font-bold px-8 py-3 rounded-full hover:scale-110 transition-transform"
            >
              Continue Journey
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}