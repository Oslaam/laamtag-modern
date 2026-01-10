'use client';

import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { Package, Zap, ArrowDownToLine } from 'lucide-react';

export default function BoxModal({ isOpen, content, onClose }: { isOpen: boolean, content: any, onClose: () => void }) {
    // FIX: Cast motion.div to any to bypass React 19 type conflicts
    const MotionDiv = motion.div as any;
    const MotionIcon = motion.div as any;

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                    backdropFilter: 'blur(8px)'
                }}>
                    <MotionDiv
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="terminal-card"
                        style={{
                            padding: '2px',
                            background: 'linear-gradient(180deg, #eab308 0%, #854d0e 100%)',
                            boxShadow: '0 0 60px rgba(234, 179, 8, 0.2)'
                        }}
                    >
                        <div style={{
                            backgroundColor: '#000',
                            borderRadius: '30px',
                            padding: '40px',
                            textAlign: 'center',
                            maxWidth: '380px',
                            width: '100%'
                        }}>
                            <MotionIcon
                                animate={{
                                    scale: [1, 1.1, 1],
                                    filter: ['drop-shadow(0 0 10px rgba(234,179,8,0))', 'drop-shadow(0 0 20px rgba(234,179,8,0.5))', 'drop-shadow(0 0 10px rgba(234,179,8,0))']
                                }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}
                            >
                                <div style={{
                                    background: 'rgba(234, 179, 8, 0.1)',
                                    padding: '24px',
                                    borderRadius: '50%',
                                    border: '1px solid rgba(234, 179, 8, 0.3)'
                                }}>
                                    <Package size={64} className="text-yellow-500" />
                                </div>
                            </MotionIcon>

                            <h2 style={{
                                fontSize: '28px',
                                fontWeight: 900,
                                fontStyle: 'italic',
                                color: '#fff',
                                textTransform: 'uppercase',
                                margin: '0 0 4px 0',
                                letterSpacing: '-1px'
                            }}>
                                Cargo Recovered
                            </h2>

                            <p style={{
                                color: '#eab308',
                                fontWeight: 900,
                                fontSize: '10px',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                marginBottom: '32px'
                            }}>
                                Protocol: Reactor Extraction
                            </p>

                            <div style={{
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                border: '1px dashed rgba(255,255,255,0.1)',
                                padding: '20px',
                                borderRadius: '16px',
                                marginBottom: '32px'
                            }}>
                                <span style={{
                                    fontSize: '32px',
                                    fontWeight: 900,
                                    color: '#fff',
                                    fontFamily: 'monospace'
                                }}>
                                    {content}
                                </span>
                            </div>

                            <button
                                onClick={onClose}
                                className="terminal-button"
                                style={{
                                    width: '100%',
                                    backgroundColor: '#fff',
                                    color: '#000',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}
                            >
                                <ArrowDownToLine size={18} />
                                SECURE ASSETS
                            </button>
                        </div>
                    </MotionDiv>
                </div>
            )}
        </AnimatePresence>
    );
}