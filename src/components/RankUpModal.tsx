"use client";

import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

// This constant bypasses the React 19 / Framer Motion type conflict
const MotionDiv = motion.div as any;

interface RankUpModalProps {
  isOpen: boolean;
  newRank: {
    bg: string;
    color: string;
    name: string;
  };
  onClose: () => void;
}

export default function RankUpModal({ isOpen, newRank, onClose }: RankUpModalProps) {
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
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
          <MotionDiv
            initial={{ scale: 0.5, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            className={`p-10 rounded-[40px] border-2 border-white/20 text-center ${newRank?.bg || ''}`}
          >
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/50 mb-2">
              New Rank Unlocked
            </h2>
            <h1 className={`text-6xl font-black italic uppercase ${newRank?.color || 'text-white'} mb-6`}>
              {newRank?.name || 'RANK UP'}
            </h1>
            <button
              onClick={onClose}
              className="bg-white text-black font-bold px-8 py-3 rounded-full hover:scale-110 transition-transform"
            >
              Continue Journey
            </button>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}