import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { senderAddress, receiverAddress, senderUsername } = req.body;

    try {
        const friendship = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { senderId: senderAddress, receiverId: receiverAddress },
                    { senderId: receiverAddress, receiverId: senderAddress }
                ],
                status: 'ACCEPTED'
            }
        });

        if (!friendship) return res.status(403).json({ error: "NEURAL_LINK_NOT_ESTABLISHED" });

        const now = new Date();
        const lastPokeAt = friendship.lastPokeAt ? new Date(friendship.lastPokeAt) : null;
        const hoursDiff = lastPokeAt ? (now.getTime() - lastPokeAt.getTime()) / (1000 * 3600) : null;

        let newStreak = friendship.streak;

        // --- THE "1D" ROUND-TRIP LOGIC ---

        // SCENARIO A: You are the same person who poked last
        if (friendship.lastPokedBy === senderAddress) {
            // Strict 24h block: You can't nudge again until 24h passed (resetting the dead streak)
            if (hoursDiff !== null && hoursDiff < 24) {
                return res.status(429).json({
                    error: "COOLDOWN_ACTIVE",
                    message: "Wait for a response or 24h to reset."
                });
            }
            // If you nudge again after 24h because they never replied, streak dies.
            newStreak = 0;
        }
        // SCENARIO B: You are replying to their nudge
        else {
            if (hoursDiff !== null && hoursDiff <= 24) {
                // SUCCESS: This closes the loop. Now it's 1 Day.
                newStreak += 1;
            } else {
                // FAIL: They nudged you, but you took > 24h to reply. Reset.
                newStreak = 0;
            }
        }

        // Update record
        await prisma.friendship.update({
            where: { id: friendship.id },
            data: {
                streak: newStreak,
                lastPokeAt: now,
                lastPokedBy: senderAddress
            }
        });

        // Notifications
        let notifMessage = `${senderUsername} nudged you!`;
        if (newStreak > 0) {
            notifMessage = `🔥 ${newStreak}D STREAK! ${senderUsername} completed the exchange!`;
        }

        await prisma.notification.create({
            data: {
                userId: receiverAddress,
                type: 'POKE',
                fromAddress: senderAddress,
                message: notifMessage
            }
        });

        return res.status(200).json({ success: true, streak: newStreak });

    } catch (error) {
        console.error("Poke Error:", error);
        return res.status(500).json({ error: "SYSTEM_FAILURE" });
    }
}