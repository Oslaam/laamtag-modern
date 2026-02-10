import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';

const prisma = new PrismaClient();

webpush.setVapidDetails(
    'mailto:admin@uselaamtag.xyz',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { walletAddress } = req.body;

    try {
        // 1. Find the subscription for your wallet
        const subData = await prisma.pushSubscription.findFirst({
            where: { walletAddress }
        });

        if (!subData) {
            return res.status(404).json({ error: "No subscription found for this wallet." });
        }

        // 2. The Message Payload
        const payload = JSON.stringify({
            title: "🚀 Test Successful!",
            body: "Your LaamTag notification system is online.",
            url: "/hub"
        });

        // 3. Fire!
        await webpush.sendNotification(subData.subscription as any, payload);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Push failed" });
    }
}