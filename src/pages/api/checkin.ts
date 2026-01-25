import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { logActivity } from '../../lib/activityLogger';

const LAAM_REWARDS = [100, 100, 300, 400, 500, 500, 600];
const TAG_REWARDS = [1, 1, 1, 2, 1, 1, 2];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { walletAddress, asset } = req.body;
  const now = new Date();

  try {
    const user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Determine which field to check based on asset type
    const field = asset === 'LAAM' ? 'lastLaamCheckIn' : 'lastTagCheckIn';
    const lastDate = user[field]; // Prisma correctly types this as Date | null

    // Check if user already claimed TODAY (Since Midnight)
    if (lastDate) {
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (lastDate >= todayMidnight) {
        return res.status(400).json({
          message: `Daily ${asset} already secured for today! Resets at midnight.`
        });
      }
    }

    // Streak logic: Reset streak if it has been more than 48 hours since LAST overall check-in
    const lastOverallCheckIn = user.lastCheckIn;
    let newStreak = 1;
    if (lastOverallCheckIn) {
      const hoursSinceLast = (now.getTime() - lastOverallCheckIn.getTime()) / (1000 * 60 * 60);

      // If user missed the 48-hour window, they start over at Day 1
      if (hoursSinceLast < 48) {
        newStreak = (user.streakCount % 7) + 1;
      } else {
        newStreak = 1;
      }
    }

    const reward = asset === 'LAAM' ? LAAM_REWARDS[newStreak - 1] : TAG_REWARDS[newStreak - 1];

    const updatedUser = await prisma.user.update({
      where: { walletAddress },
      data: {
        [asset === 'LAAM' ? 'laamPoints' : 'tagTickets']: { increment: reward },
        [field]: now,
        lastCheckIn: now,
        streakCount: newStreak
      }
    });

    await logActivity(walletAddress, 'DAILY_CHECKIN' as any, reward, asset);

    return res.status(200).json({
      success: true,
      reward,
      asset,
      total: asset === 'LAAM' ? updatedUser.laamPoints : updatedUser.tagTickets
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Check-in failed" });
  }
}