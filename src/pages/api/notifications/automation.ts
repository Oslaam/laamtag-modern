import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';

const prisma = new PrismaClient();

// Configuration using your correct support email
webpush.setVapidDetails(
    'mailto:support@uselaamtag.xyz',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // 1. Standard Auth + Extracting targetWallet for specific alerts
    const { auth_key, type, questTitle, targetWallet } = req.query;

    if (auth_key !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        let usersToNotify = [];
        let payload = {
            title: "LaamTag Alert",
            body: "New updates in the terminal.",
            url: "/dashboard"
        };

        // 2. Logic: Determine who to notify based on the 'type'
        if (type === 'DAILY_REMINDER') {
            usersToNotify = await prisma.user.findMany({
                where: {
                    OR: [
                        { lastCheckIn: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                        { lastCheckIn: null }
                    ],
                    pushSubscriptions: { some: {} }
                },
                include: { pushSubscriptions: true }
            });
            payload.title = "💰 Daily Reward";
            payload.body = "Don't break your streak! Your daily TAG is waiting.";
        }

        else if (type === 'STAKING_ALERT') {
            const stakers = await prisma.stakedNFT.findMany({
                where: { lastClaimed: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                select: { ownerAddress: true }
            });
            const addresses = [...new Set(stakers.map(s => s.ownerAddress))];
            usersToNotify = await prisma.user.findMany({
                where: { walletAddress: { in: addresses }, pushSubscriptions: { some: {} } },
                include: { pushSubscriptions: true }
            });
            payload.title = "🏦 Staking Ready";
            payload.body = "Your staking rewards are ready to harvest!";
        }

        else if (type === 'NEW_QUEST') {
            usersToNotify = await prisma.user.findMany({
                where: { pushSubscriptions: { some: {} } },
                include: { pushSubscriptions: true }
            });
            payload.title = "⚔️ New Quest Alert!";
            payload.body = (questTitle as string) || "A new seeker mission is available in the Hub!";
        }

        // NEW LOGIC: Target a single user for a raffle refund
        else if (type === 'RAFFLE_REFUND' && targetWallet) {
            usersToNotify = await prisma.user.findMany({
                where: {
                    walletAddress: targetWallet as string,
                    pushSubscriptions: { some: {} }
                },
                include: { pushSubscriptions: true }
            });
            payload.title = "🎟️ Raffle Refund";
            payload.body = "A refund has been issued to your terminal. Check your balance!";
            payload.url = "/history";
        }

        // 3. Send the Messages
        const notifications = usersToNotify.flatMap(user =>
            user.pushSubscriptions.map(sub =>
                webpush.sendNotification(sub.subscription as any, JSON.stringify(payload))
                    .catch(async (err) => {
                        // Clean up expired subscriptions (user uninstalled PWA or revoked permission)
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            await prisma.pushSubscription.delete({ where: { id: sub.id } });
                        }
                    })
            )
        );

        await Promise.all(notifications);
        return res.status(200).json({ success: true, sent: usersToNotify.length });

    } catch (error) {
        console.error("Automation Error:", error);
        return res.status(500).json({ error: "Failed to dispatch" });
    }
}