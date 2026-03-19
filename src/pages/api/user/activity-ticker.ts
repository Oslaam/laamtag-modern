import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const activitiesRaw = await prisma.activity.findMany({
            take: 15,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { // This assumes your Activity model has a relation to User
                    select: {
                        username: true
                    }
                }
            }
        });

        // Map the data so the frontend gets a clean 'username' field
        const activities = activitiesRaw.map(act => {
            const isBadge = act.type === 'BADGE_CLAIM';
            return {
                ...act,
                username: act.user?.username || null,
                // If it's a badge, the asset is the word "BADGE", otherwise use the database asset
                asset: isBadge ? 'BADGE' : (act.asset?.toUpperCase() || 'SKR')
            };
        });

        res.status(200).json(activities);
    } catch (e) {
        console.error("Ticker API Error:", e);
        res.status(500).json({ error: "Failed to fetch feed" });
    }
}