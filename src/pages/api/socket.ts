import { Server } from 'socket.io';

// We use a Set to track unique socket IDs for the Message Counter
const activeUsers = new Set();

export default function SocketHandler(req: any, res: any) {
    if (res.socket.server.io) {
        // Even if the server exists, we need to ensure the listener is active
        res.end();
        return;
    }

    const io = new Server(res.socket.server, {
        path: '/api/socket',
        addTrailingSlash: false,
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        transports: ['websocket', 'polling']
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
        // 1. Track the new node connection
        activeUsers.add(socket.id);

        // 2. Broadcast the updated unique user count to everyone (including Admin)
        io.emit('user-count-update', activeUsers.size);

        // 3. Handle Message Interception
        socket.on('send-message', (data) => {
            // broadcast.emit sends to everyone EXCEPT the sender
            // This is used because the sender adds the bubble to their own UI immediately
            socket.broadcast.emit('receive-message', {
                ...data,
                timestamp: new Date().toISOString() // Ensure synced time
            });
        });

        // 4. Handle Disconnection
        socket.on('disconnect', () => {
            activeUsers.delete(socket.id);
            // Update the count for everyone else
            io.emit('user-count-update', activeUsers.size);
        });
    });

    res.end();
}