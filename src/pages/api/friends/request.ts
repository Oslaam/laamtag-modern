import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { senderAddress, receiverAddress, senderUsername } = req.body;

    if (!senderAddress || !receiverAddress) {
        return res.status(400).json({ error: "Missing addresses" });
    }

    try {
        // 1. Create or Update the Friendship status
        await prisma.friendship.upsert({
            where: {
                senderId_receiverId: {
                    senderId: senderAddress,
                    receiverId: receiverAddress
                }
            },
            update: { status: 'PENDING' },
            create: {
                senderId: senderAddress,
                receiverId: receiverAddress,
                status: 'PENDING'
            }
        });

        // 2. Create the Notification for the Bell
        await prisma.notification.create({
            data: {
                userId: receiverAddress,
                type: 'FRIEND_REQUEST',
                fromAddress: senderAddress,
                message: `${senderUsername || 'A tagger'} sent you a friend request!`
            }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Friend Request Error:", error);
        return res.status(500).json({ error: "Failed to send request" });
    }
}