import { Server } from 'socket.io';

const activeUsers = new Set();
const chatStates: Record<string, { step: number; adminJoined: boolean }> = {};

export default function SocketHandler(req: any, res: any) {
    if (res.socket.server.io) {
        res.end();
        return;
    }

    const io = new Server(res.socket.server, {
        path: '/api/socket',
        addTrailingSlash: false,
        cors: { origin: "*", methods: ["GET", "POST"] },
        transports: ['websocket', 'polling']
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
        activeUsers.add(socket.id);
        io.emit('user-count-update', activeUsers.size);

        // User joins their private room
        socket.on('join-private-room', (walletAddress: string) => {
            socket.join(walletAddress);
            chatStates[walletAddress] = { step: 0, adminJoined: false };

            setTimeout(() => {
                io.to(walletAddress).emit('support-message', {
                    sender: 'SYSTEM',
                    text: "GREETINGS. I am the LAAM Terminal AI. How can I assist you today?"
                });
                chatStates[walletAddress].step = 1;
            }, 3000);
        });

        // User sends a message
        socket.on('user-send-message', (data: { walletAddress: string; text: string; sender: string }) => {
            const room = data.walletAddress;
            const state = chatStates[room];

            if (state && !state.adminJoined) {
                if (state.step === 1) {
                    setTimeout(() => {
                        io.to(room).emit('support-message', {
                            sender: 'SYSTEM',
                            text: "Understood. Please describe your issue in detail so I can prepare for an authorized agent."
                        });
                        state.step = 2;
                    }, 1500);
                } else if (state.step === 2) {
                    setTimeout(() => {
                        io.to(room).emit('support-message', {
                            sender: 'SYSTEM',
                            text: "TRANSMITTING... Please wait 3-5 minutes for an agent. DO NOT CLOSE THIS WINDOW."
                        });
                        io.to('admin-room').emit('new-ticket-notification', {
                            walletAddress: data.walletAddress,
                            title: "LIVE CHAT INTERCEPT",
                            description: data.text,
                            type: 'LIVE_CHAT',
                            isAIGenerated: true,
                            aiSummary: `User requesting help: ${data.text.substring(0, 80)}...`,
                            suggestedAction: "CONNECT_TO_BRIDGE",
                            status: 'WAITING'
                        });
                        state.step = 3;
                    }, 1500);
                } else {
                    // Waiting for admin — forward to admin room
                    io.to('admin-room').emit('user-message-incoming', data);
                }
            } else {
                // Admin joined — forward messages
                io.to('admin-room').emit('user-message-incoming', data);
            }
        });

        // Admin joins a user room
        socket.on('agent-join-room', (walletAddress: string) => {
            socket.join(walletAddress);
            socket.join('admin-room');

            if (chatStates[walletAddress]) {
                chatStates[walletAddress].adminJoined = true;
            } else {
                chatStates[walletAddress] = { step: 3, adminJoined: true };
            }

            io.to(walletAddress).emit('agent-joined');
        });

        // Admin sends message to user
        socket.on('agent-send-message', (data: { walletAddress: string; text: string; sender: string }) => {
            io.to(data.walletAddress).emit('support-message', data);
        });

        // Admin closes the ticket — only admin can do this
        socket.on('close-ticket', (walletAddress: string) => {
            io.to(walletAddress).emit('ticket-closed');
            delete chatStates[walletAddress];
        });

        socket.on('disconnect', () => {
            activeUsers.delete(socket.id);
            io.emit('user-count-update', activeUsers.size);
        });
    });

    res.end();
}