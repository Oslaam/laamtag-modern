import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';

const prisma = new PrismaClient();

export default async function handler(req, res) {
    // 1. Security Check: Ensure only your Cron service can hit this
    // const authHeader = req.headers.authorization;
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401)...

    // 2. Identify who needs a notification (Staking, Daily, or New Quest)
    const subscribers = await prisma.pushSubscription.findMany();

    const notifications = subscribers.map(async (sub) => {
        try {
            await webpush.sendNotification(
                sub.subscription as any,
                JSON.stringify({
                    title: "💰 Reward Ready!",
                    body: "It's been 24h! Claim your daily TAG now.",
                    url: "/dashboard"
                })
            );
        } catch (err) {
            // If subscription expired/uninstalled, delete it from DB
            if (err.statusCode === 410) {
                await prisma.pushSubscription.delete({ where: { id: sub.id } });
            }
        }
    });

    await Promise.all(notifications);
    res.status(200).json({ success: true, sent: subscribers.length });
}