import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';

export default function NotificationSentry() {
    const { publicKey } = useWallet();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const requestPermission = async () => {
        if (!publicKey) {
            alert("Please connect your wallet first!");
            return;
        }

        if (!('Notification' in window)) {
            alert("This browser does not support desktop notifications.");
            return;
        }

        setLoading(true);
        try {
            // 1. Ask for browser permission
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                // 2. Wait for Service Worker to be ready
                const reg = await navigator.serviceWorker.ready;

                // 3. Subscribe to Push Manager
                const sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
                });

                // 4. Send the subscription object to your database
                const response = await fetch('/api/notifications/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        walletAddress: publicKey.toString(),
                        subscription: sub // This contains the 'endpoint' and 'keys' Prisma needs
                    }),
                });

                if (response.ok) {
                    setStatus('success');
                    console.log('Successfully saved to DB');
                } else {
                    throw new Error('Failed to save to database');
                }
            } else {
                alert("Notifications blocked. Please enable them in your browser settings.");
            }
        } catch (err) {
            console.error('Subscription error:', err);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'success') {
        return (
            <div className="terminal-card" style={{ border: '1px solid #4ade80', marginBottom: '20px', textAlign: 'center' }}>
                <p className="terminal-desc" style={{ color: '#4ade80' }}>SYSTEM ALERTS ACTIVE</p>
                <p style={{ fontSize: '10px', color: '#fff' }}>You will now receive hub updates.</p>
            </div>
        );
    }

    return (
        <div className="terminal-card" style={{ border: '1px solid #eab308', marginBottom: '20px' }}>
            <p className="terminal-desc" style={{ color: '#eab308' }}>ENABLE SYSTEM ALERTS</p>
            <button
                onClick={requestPermission}
                disabled={loading || !publicKey}
                className="footer-item highlight"
                style={{
                    width: '100%',
                    marginTop: '10px',
                    opacity: (!publicKey || loading) ? 0.5 : 1,
                    cursor: loading ? 'wait' : 'pointer'
                }}
            >
                {loading ? 'INITIALIZING...' : publicKey ? 'ALLOW NOTIFICATIONS' : 'CONNECT WALLET FIRST'}
            </button>
            {status === 'error' && (
                <p style={{ color: '#f87171', fontSize: '10px', marginTop: '5px' }}>Link failed. Try again.</p>
            )}
        </div>
    );
}