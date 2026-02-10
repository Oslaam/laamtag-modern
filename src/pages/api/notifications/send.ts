import webpush from 'web-push';
import { NextApiRequest, NextApiResponse } from 'next';

// Use the keys you generated earlier
webpush.setVapidDetails(
    'mailto:admin@uselaamtag.xyz',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { subscription, type } = req.body;

    // Define different alert messages
    const alerts: any = {
        daily: { title: "💰 Daily Reward", body: "Your daily TAG is ready! Claim it now." },
        quest: { title: "⚔️ New Quest", body: "A new Seeker mission has appeared in the Hub!" },
        staking: { title: "🏦 Staking Update", body: "Your staking rewards are ripe for harvesting." },
        raffle: { title: "🎟️ Raffle Alert", body: "A new LAAM raffle is live. Join before it ends!" },
        refund: { title: "💸 Refund Issued", body: "Your raffle entry has been refunded." } // <-- ADD THIS
    };

    const payload = JSON.stringify(alerts[type] || alerts.daily);

    try {
        await webpush.sendNotification(subscription, payload);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error sending push:", error);
        return res.status(500).json({ error: "Failed to send notification" });
    }
}