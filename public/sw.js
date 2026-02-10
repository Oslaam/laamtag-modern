// public/sw.js
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'LaamTag Alert', body: 'New rewards available!' };

    const options = {
        body: data.body,
        // Using your high-res 512 icon for the notification
        icon: '/laaamtag512-icon.png',
        // Using your 32x32 favicon for the small status bar icon
        badge: '/favicon-32.png',
        data: { url: data.url || '/' },
        vibrate: [100, 50, 100], // Makes the phone vibrate
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});