self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {
        title: 'LaamTag Alert',
        body: 'New rewards available!',
        url: '/'
    };

    const options = {
        body: data.body,
        icon: '/laaamtag512-icon.png',
        badge: '/favicon-32.png',
        data: { url: data.url || '/' },
        vibrate: [200, 100, 200], // Slightly stronger vibration pattern

        // --- STYLING & BEHAVIOR ---
        tag: 'laamtag-notification', // Groups notifications so they don't stack infinitely
        renotify: true,              // Vibrates even if a previous notification is still there

        // --- ACTION BUTTONS ---
        actions: [
            {
                action: 'open_url',
                title: '🚀 Open Terminal',
            },
            {
                action: 'close',
                title: 'Dismiss',
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    const notification = event.notification;
    const action = event.action;

    notification.close();

    if (action === 'close') {
        return; // User just clicked Dismiss
    } else {
        // User clicked the notification or the "Open Terminal" button
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
                // If the app is already open, focus it
                for (let client of windowClients) {
                    if (client.url === notification.data.url && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise, open a new window
                if (clients.openWindow) {
                    return clients.openWindow(notification.data.url);
                }
            })
        );
    }
});