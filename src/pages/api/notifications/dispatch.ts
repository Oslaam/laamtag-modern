import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';

const prisma = new PrismaClient();

webpush.setVapidDetails(
    'mailto:admin@uselaamtag.xyz',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { type, questTitle } = req.body;

    try {
        let targets = [];

        switch (type) {
            case 'DAILY_CHECKIN':
                // Find users who haven't checked in for 24 hours
                targets = await prisma.user.findMany({
                    where: {
                        OR: [
                            { lastCheckIn: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                            { lastCheckIn: null }
                        ],
                        pushSubscriptions: { some: {} }
                    },
                    include: { pushSubscriptions: true }
                });
                break;

            case 'NEW_QUEST':
                // Notify EVERYONE who is subscribed
                targets = await prisma.user.findMany({
                    where: { pushSubscriptions: { some: {} } },
                    include: { pushSubscriptions: true }
                });
                break;

            case 'STAKING_REWARD':
                // Look at StakedNFT table - find owners who haven't claimed recently
                const stakers = await prisma.stakedNFT.findMany({
                    where: { lastClaimed: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                    select: { ownerAddress: true }
                });
                const addresses = [...new Set(stakers.map(s => s.ownerAddress))];
                targets = await prisma.user.findMany({
                    where: { walletAddress: { in: addresses }, pushSubscriptions: { some: {} } },
                    include: { pushSubscriptions: true }
                });
                break;
        }

        // Send the actual messages
        const notifications = targets.flatMap(user =>
            user.pushSubscriptions.map(sub =>
                webpush.sendNotification(
                    sub.subscription as any,
                    JSON.stringify({
                        title: getTitle(type),
                        body: getBody(type, questTitle),
                        url: '/'
                    })
                ).catch(async (err) => {
                    if (err.statusCode === 410) {
                        // Clean up expired subscriptions
                        await prisma.pushSubscription.delete({ where: { id: sub.id } });
                    }
                })
            )
        );

        await Promise.all(notifications);
        return res.status(200).json({ success: true, sentTo: targets.length });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Helper functions for content
function getTitle(type) {
    if (type === 'DAILY_CHECKIN') return "💰 Daily TAG Ready";
    if (type === 'NEW_QUEST') return "⚔️ New Mission";
    if (type === 'STAKING_REWARD') return "🏦 Yield Harvest";
    return "LaamTag Alert";
}

function getBody(type, questTitle) {
    if (type === 'DAILY_CHECKIN') return "Don't lose your streak! Claim your daily reward now.";
    if (type === 'NEW_QUEST') return `${questTitle || 'A new quest'} is now live in the Hub.`;
    if (type === 'STAKING_REWARD') return "Your staked NFTs have generated rewards. Claim them now!";
    return "New updates available in the terminal.";
}