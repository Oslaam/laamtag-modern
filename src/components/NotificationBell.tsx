import { FC, useState, useEffect } from 'react';
import { Bell, UserPlus, Gamepad2, Coins, Megaphone } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import styles from '../styles/NotificationBell.module.css';

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
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
            }
        } catch (err) {
            console.error("Error accepting friend request");
        }
    };

    if (!publicKey) return null;

    return (
        <div className={styles.bellWrapper}>
            <button onClick={markAsRead} className={styles.bellBtn}>
                <Bell size={20} color={unreadCount > 0 ? "#eab308" : "#666"} />
                {unreadCount > 0 && <span className={styles.notificationDot} />}
            </button>

            {isOpen && (
                <>
                    {/* Overlay for mobile to close when clicking outside */}
                    <div className={styles.mobileOverlay} onClick={() => setIsOpen(false)} />

                    <div className={styles.notificationDropdown}>
                        <p className={styles.dropdownHeader}>COMMUNICATIONS</p>
                        {!Array.isArray(notifications) || notifications.length === 0 ? (
                            <p className={styles.emptyMsg}>No active alerts</p>
                        ) : (
                            <div className={styles.scrollArea}>
                                {notifications.map((n) => (
                                    <div key={n.id} className={styles.notificationItem}>
                                        <div className={styles.iconWrap}>
                                            {n.type === 'FRIEND_REQUEST' && <UserPlus size={14} />}
                                            {n.type === 'SYSTEM_NEWS' && <Megaphone size={14} color="#eab308" />}
                                            {n.type === 'ADMIN_ADJUST' && <Coins size={14} color="#4ade80" />}
                                            {!n.type && <Bell size={14} />}
                                        </div>
                                        <div className={styles.notifContent}>
                                            <p className={styles.notifText}>{n.message}</p>

                                            {n.type === 'GAME_INVITE' && (
                                                <button
                                                    className={styles.actionBtnPrimary}
                                                    onClick={() => {
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

                                            {n.type === 'FRIEND_REQUEST' && (
                                                <button
                                                    className={styles.actionBtn}
                                                    onClick={() => handleAcceptFriend(n.fromAddress, n.id)}
                                                >
                                                    ACCEPT
                                                </button>
                                            )}

                                            <span className={styles.notifTime}>
                                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;