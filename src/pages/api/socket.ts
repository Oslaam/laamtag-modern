import { Server } from 'socket.io';

const activeUsers = new Set();
// Track conversation progress for the AI greeting
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

        socket.on('join-private-room', (walletAddress) => {
            socket.join(walletAddress);

            // Initialize AI state for new session
            chatStates[walletAddress] = { step: 0, adminJoined: false };

            // IMMEDIATE AI GREETING
            setTimeout(() => {
                io.to(walletAddress).emit('agent-send-message', {
                    sender: 'SYSTEM',
                    text: "GREETINGS. I am the LAAM Terminal AI. How can I assist you today?"
                });
                chatStates[walletAddress].step = 1;
            }, 1500);
        });

        socket.on('user-send-message', (data) => {
            const room = data.walletAddress;
            const state = chatStates[room];

            // If no admin has joined, the AI handles the logic
            if (state && !state.adminJoined) {
                if (state.step === 1) {
                    // USER REPLIED TO GREETING -> AI ASKS FOR ISSUE
                    setTimeout(() => {
                        io.to(room).emit('agent-send-message', {
                            sender: 'SYSTEM',
                            text: "Understood. Please describe your issue or inquiry in detail so I can prepare the transmission for an authorized agent."
                        });
                        state.step = 2;
                    }, 1500);
                }


                else if (state.step === 2) {
                    // USER DESCRIBED ISSUE -> AI PREPARES TRANSMISSION
                    const userDescription = data.text;

                    setTimeout(() => {
                        io.to(room).emit('agent-send-message', {
                            sender: 'SYSTEM',
                            text: "TRANSMITTING DATA... Please wait 3-5 minutes for an agent to connect. DO NOT CLOSE THIS WINDOW."
                        });

                        // This is where the "Neural Intercept" happens for the Admin
                        io.to('admin-room').emit('new-ticket-notification', {
                            walletAddress: data.walletAddress,
                            title: "LIVE CHAT INTERCEPT",
                            description: userDescription,
                            type: 'LIVE_CHAT',
                            isAIGenerated: true,
                            aiSummary: `User is requesting assistance via Live Bridge regarding: ${userDescription.substring(0, 50)}...`,
                            suggestedAction: "CONNECT_TO_BRIDGE",
                            status: 'WAITING'
                        });
                    }, 1500);
                    state.step = 3;
                }
            } else {
                // If admin is joined, just forward the message to admin-room
                io.to('admin-room').emit('new-ticket-notification', data);
            }
        });

        socket.on('agent-join-room', (walletAddress) => {
            socket.join(walletAddress);
            socket.join('admin-room');

            // Mark as admin joined so AI stops replying
            if (chatStates[walletAddress]) {
                chatStates[walletAddress].adminJoined = true;
            }

            io.to(walletAddress).emit('agent-joined');
        });

        socket.on('agent-send-message', (data) => {
            socket.to(data.walletAddress).emit('agent-send-message', data);
        });

        socket.on('disconnect', () => {
            activeUsers.delete(socket.id);
            io.emit('user-count-update', activeUsers.size);
        });
    });

    res.end();
}