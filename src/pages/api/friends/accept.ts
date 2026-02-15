import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { senderAddress, receiverAddress, notificationId } = req.body;

    try {
        // 1. Update Friendship status to ACCEPTED
        await prisma.friendship.update({
            where: {
                senderId_receiverId: {
                    senderId: senderAddress,
                    receiverId: receiverAddress
                }
            },
            data: { status: 'ACCEPTED' }
        });

        // 2. Delete the notification so it clears from the bell
        await prisma.notification.delete({
            where: { id: notificationId }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Failed to accept friend" });
    }
}