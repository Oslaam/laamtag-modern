import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { walletAddress, subscription } = req.body;

    if (!walletAddress || !subscription) {
        return res.status(400).json({ message: 'Missing wallet or subscription data' });
    }

    try {
        // We use upsert to avoid duplicate subscriptions for the same wallet + device
        // Or simply create a new one. Here, we create:
        await prisma.pushSubscription.create({
            data: {
                walletAddress,
                subscription: subscription, // This is the JSON object from the browser
                userAgent: req.headers['user-agent']
            }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Subscription Error:', error);
        return res.status(500).json({ error: 'Failed to save subscription' });
    }
}