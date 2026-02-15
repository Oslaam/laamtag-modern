import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { poolId, senderAddress } = req.body;

    try {
        // 1. Check Cooldown (Last invite from this sender for this pool or any pool)
        const lastInvite = await prisma.gameInvite.findFirst({
            where: { senderId: senderAddress },
            orderBy: { createdAt: 'desc' }
        });

        if (lastInvite) {
            const hoursSince = (Date.now() - new Date(lastInvite.createdAt).getTime()) / (1000 * 3600);
            if (hoursSince < 6) {
                const waitTime = (6 - hoursSince).toFixed(1);
                return res.status(429).json({
                    error: `SYSTEM_COOLDOWN: Wait ${waitTime} more hours.`
                });
            }
        }

        // 2. Fetch all accepted friends
        const friendships = await prisma.friendship.findMany({
            where: {
                OR: [
                    { senderId: senderAddress },
                    { receiverId: senderAddress }
                ],
                status: 'ACCEPTED'
            }
        });

        const friendAddresses = friendships.map(f =>
            f.senderId === senderAddress ? f.receiverId : f.senderId
        );

        if (friendAddresses.length === 0) {
            return res.status(404).json({ error: "NO_OPERATORS_FOUND: Add friends first." });
        }

        // 3. Create Invites and Notifications in Bulk
        const inviteData = friendAddresses.map(addr => ({
            senderId: senderAddress,
            receiverId: addr,
            poolId: poolId,
            gameType: 'RAFFLE'
        }));

        const notificationData = friendAddresses.map(addr => ({
            userId: addr,
            type: 'GAME_INVITE',
            fromAddress: senderAddress,
            message: `URGENT: Join my Matrix Sprint Pool! [Pool ID: ${poolId.slice(-4)}]`
        }));

        // Execute in a transaction
        await prisma.$transaction([
            prisma.gameInvite.createMany({ data: inviteData }),
            prisma.notification.createMany({ data: notificationData })
        ]);

        return res.status(200).json({ count: friendAddresses.length });

    } catch (error) {
        console.error("Invite Blast Error:", error);
        return res.status(500).json({ error: "COMMUNICATION_FAILURE" });
    }
}