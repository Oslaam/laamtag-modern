"use client";

import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { ShieldCheck, ArrowUpCircle } from 'lucide-react';

// Bypassing React 19 / Framer Motion type conflict
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
      // Golden/Neon themed confetti for the rank up
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#EAB308', '#FFFFFF', '#111111']
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
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)'
          }}
        >
          {/* Scanline Effect Overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
            backgroundSize: '100% 4px, 3px 100%',
            pointerEvents: 'none'
          }} />

          <MotionDiv
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            className="terminal-card"
            style={{
              padding: '60px 40px',
              textAlign: 'center',
              maxWidth: '500px',
              width: '90%',
              background: '#000',
              border: `2px solid ${newRank?.color || '#eab308'}`,
              boxShadow: `0 0 50px -10px ${newRank?.color || '#eab308'}44`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <ArrowUpCircle size={48} style={{ color: newRank?.color || '#eab308' }} className="animate-bounce" />
            </div>

            <h2 style={{
              fontSize: '10px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '4px',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '8px'
            }}>
              Clearance Level Elevated
            </h2>

            <h1 style={{
              fontSize: '48px',
              fontWeight: 900,
              fontStyle: 'italic',
              textTransform: 'uppercase',
              color: newRank?.color || '#fff',
              margin: '0 0 40px 0',
              lineHeight: 1,
              letterSpacing: '-2px',
              textShadow: `0 0 20px ${newRank?.color || '#eab308'}66`
            }}>
              {newRank?.name || 'OPERATOR'}
            </h1>

            <button
              onClick={onClose}
              className="terminal-button"
              style={{
                background: newRank?.color || '#eab308',
                color: '#000',
                padding: '12px 40px',
                fontSize: '14px',
                width: '100%'
              }}
            >
              RESUME MISSION
            </button>

            <p style={{
              fontSize: '8px',
              color: 'rgba(255,255,255,0.2)',
              marginTop: '24px',
              textTransform: 'uppercase',
              fontWeight: 900
            }}>
              Identity authenticated. Network privileges updated.
            </p>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}