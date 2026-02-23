import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { walletAddress } = req.query;

    if (!walletAddress) return res.status(400).json({ error: "Wallet address required" });

    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Fetch all relevant history for stats and list from the 'activity' table
        const history = await prisma.activity.findMany({
            where: { userId: walletAddress as string },
            orderBy: { createdAt: 'desc' },
            take: 100 // Higher take to calculate streak accurately
        });

        // 1. Calculate Today's Earnings (LAAM + SKR)
        const todayEarned = history
            .filter(item =>
                new Date(item.createdAt) >= startOfToday &&
                (item.asset === 'LAAM' || item.asset === 'SKR') &&
                item.amount > 0
            )
            .reduce((sum, item) => sum + item.amount, 0);
        // 2. Calculate Earning Streak (Consecutive days with a Reward/Win)
        let streak = 0;
        const earningDates = new Set(
            history
                .filter(item => item.amount > 0)
                .map(item => new Date(item.createdAt).toLocaleDateString())
        );

        let checkDate = new Date();
        // If they haven't earned today, start checking from yesterday to see if streak is alive
        if (!earningDates.has(checkDate.toLocaleDateString())) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        while (earningDates.has(checkDate.toLocaleDateString())) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }

        return res.status(200).json({
            history: history.slice(0, 50), // Return only last 50 for the UI list
            stats: {
                todayEarned,
                streak
            }
        });
    } catch (error) {
        console.error("Ledger Fetch Error:", error);
        return res.status(500).json({ error: "Failed to fetch history" });
    }
}