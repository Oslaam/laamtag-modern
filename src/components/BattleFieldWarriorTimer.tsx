import React, { useState, useEffect, useRef } from 'react';

interface TimerProps {
    expiryDate: string;
    onFinished: () => void;
}

const WarriorTimer = ({ expiryDate, onFinished }: TimerProps) => {
    const [timeLeft, setTimeLeft] = useState("");
    // Track if we've already triggered the finish to avoid duplicate calls
    const finishedRef = useRef(false);

    useEffect(() => {
        // Reset the flag if the expiryDate changes
        finishedRef.current = false;

        const calculateTime = () => {
            const difference = +new Date(expiryDate) - +new Date();

            if (difference <= 0) {
                setTimeLeft("READY FOR EXTRACTION");
                if (!finishedRef.current) {
                    finishedRef.current = true;
                    onFinished();
                }
                return true; // Signal to stop
            }

            const h = Math.floor(difference / (1000 * 60 * 60));
            const m = Math.floor((difference / (1000 * 60)) % 60);
            const s = Math.floor((difference / 1000) % 60);

            const pad = (n: number) => n.toString().padStart(2, '0');
            setTimeLeft(`${pad(h)}:${pad(m)}:${pad(s)}`);
            return false;
        };

        const isDone = calculateTime();
        if (isDone) return;

        const timer = setInterval(() => {
            const shouldStop = calculateTime();
            if (shouldStop) clearInterval(timer);
        }, 1000);

        return () => clearInterval(timer);
    }, [expiryDate, onFinished]);

    return (
        <div style={{
            color: '#fb923c',
            fontSize: '11px',
            fontWeight: '900',
            fontFamily: 'monospace',
            letterSpacing: '1px',
            textShadow: '0 0 5px rgba(251, 146, 60, 0.4)'
        }}>
            {timeLeft}
        </div>
    );
};

export default WarriorTimer;