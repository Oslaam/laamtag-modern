import { FC, useState, useEffect } from 'react';
import { Bell, UserPlus, Gamepad2, Coins, Megaphone } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';

const NotificationBell: FC = () => {
    const { publicKey } = useWallet();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const unreadCount = Array.isArray(notifications)
        ? notifications.filter(n => !n.isRead).length
        : 0;

    const fetchNotifications = async () => {
        if (!publicKey) return;
        try {
            // Note: Updated to match your filename notification-bell.ts
            const res = await fetch(`/api/user/notification-bell?address=${publicKey.toString()}`);
            const data = await res.json();

            if (res.ok && Array.isArray(data)) {
                setNotifications(data);
            } else {
                setNotifications([]);
            }
        } catch (err) {
            console.error("Failed to fetch notifications");
            setNotifications([]);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, [publicKey]);

    const markAsRead = async () => {
        setIsOpen(!isOpen);
        if (!isOpen && unreadCount > 0 && publicKey) {
            try {
                await fetch(`/api/user/notification-bell?address=${publicKey.toString()}`, { method: 'PATCH' });
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            } catch (err) {
                console.error("Failed to mark notifications as read");
            }
        }
    };

    const handleAcceptFriend = async (senderAddress: string, notificationId: string) => {
        try {
            const res = await fetch('/api/friends/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderAddress,
                    receiverAddress: publicKey?.toString(),
                    notificationId
                })
            });
            if (res.ok) {
                // Remove the notification from the list immediately upon acceptance
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
            }
        } catch (err) {
            console.error("Error accepting friend request");
        }
    };

    if (!publicKey) return null;

    return (
        <div style={{ position: 'relative' }}>
            <button onClick={markAsRead} className="bell-btn">
                <Bell size={20} color={unreadCount > 0 ? "#eab308" : "#666"} />
                {unreadCount > 0 && <span className="notification-dot" />}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <p className="dropdown-header">COMMUNICATIONS</p>
                    {!Array.isArray(notifications) || notifications.length === 0 ? (
                        <p className="empty-msg">No active alerts</p>
                    ) : (
                        notifications.map((n) => (
                            <div key={n.id} className="notification-item">
                                <div className="icon-wrap">
                                    {n.type === 'FRIEND_REQUEST' && <UserPlus size={14} />}
                                    {n.type === 'GAME_INVITE' && (
                                        <button
                                            className="action-btn"
                                            style={{ background: '#eab308', color: 'black', marginTop: '5px', fontWeight: 'bold' }} // Gold color for importance
                                            onClick={() => {
                                                // Force a clean redirect with the parameters
                                                const targetUrl = n.poolId
                                                    ? `/games?module=RAFFLE&poolId=${n.poolId}`
                                                    : '/games?module=RAFFLE';

                                                window.location.href = targetUrl;
                                                setIsOpen(false);
                                            }}
                                        >
                                            JOIN POOL
                                        </button>
                                    )}
                                    {n.type === 'SYSTEM_NEWS' && <Megaphone size={14} color="#eab308" />}
                                    {n.type === 'ADMIN_ADJUST' && <Coins size={14} color="#4ade80" />}
                                    {!n.type && <Bell size={14} />}
                                </div>
                                <div className="notif-content">
                                    <p className="notif-text">{n.message}</p>

                                    {n.type === 'FRIEND_REQUEST' && (
                                        <button
                                            className="action-btn"
                                            onClick={() => handleAcceptFriend(n.fromAddress, n.id)}
                                        >
                                            ACCEPT
                                        </button>
                                    )}

                                    <span className="notif-time">
                                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <style jsx>{`
                .bell-btn { background: none; border: none; cursor: pointer; padding: 8px; display: flex; align-items: center; }
                .notification-dot {
                    position: absolute; top: 6px; right: 6px; width: 8px; height: 8px;
                    background: #eab308; border-radius: 50%; box-shadow: 0 0 10px #eab308;
                    animation: pulse 2s infinite;
                }
                .notification-dropdown {
                    position: absolute; top: 45px; right: 0; width: 260px;
                    background: #000; border: 1px solid #222; z-index: 1000;
                    padding: 12px; font-family: 'Inter', sans-serif;
                }
                .dropdown-header { border-bottom: 1px solid #222; padding-bottom: 8px; color: #eab308; font-weight: 900; font-size: 10px; margin-bottom: 5px; }
                .notification-item { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #111; align-items: flex-start; }
                .icon-wrap { margin-top: 2px; color: #eab308; flex-shrink: 0; }
                .notif-content { display: flex; flex-direction: column; gap: 5px; }
                .notif-text { color: #ccc; font-size: 11px; margin: 0; }
                .notif-time { color: #555; font-size: 9px; }
                .action-btn {
                    background: #eab308; color: #000; border: none; border-radius: 2px;
                    padding: 3px 8px; font-size: 9px; font-weight: 900; cursor: pointer; width: fit-content;
                }
                .action-btn:hover { background: #fff; }
                .empty-msg { padding: 20px 0; color: #444; text-align: center; font-size: 10px; }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
            `}</style>
        </div>
    );
};

export default NotificationBell;