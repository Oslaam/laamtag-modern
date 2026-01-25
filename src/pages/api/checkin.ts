import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { logActivity } from '../../lib/activityLogger';

const LAAM_REWARDS = [100, 100, 300, 400, 500, 500, 600];
const TAG_REWARDS = [1, 1, 1, 2, 1, 1, 2];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { walletAddress, asset } = req.body;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    const user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Determine which specific asset field to check
    const specificField = asset === 'LAAM' ? 'lastLaamCheckIn' : 'lastTagCheckIn';
    const lastSpecificDate = user[specificField];

    // 2. Prevent double-claiming the SAME asset today
    if (lastSpecificDate && new Date(lastSpecificDate) >= todayMidnight) {
      return res.status(400).json({
        message: `Daily ${asset} already secured! Resets at midnight.`
      });
    }

    // 3. Check if user already claimed the OTHER asset today
    // If they did, we don't increment the streak count again, we just give the reward.
    const lastOverallCheckIn = user.lastCheckIn;
    const isAlreadyActiveToday = lastOverallCheckIn && new Date(lastOverallCheckIn) >= todayMidnight;

    let newStreak = user.streakCount;

    if (!isAlreadyActiveToday) {
      // First check-in of the calendar day
      if (lastOverallCheckIn) {
        const hoursSinceLast = (now.getTime() - new Date(lastOverallCheckIn).getTime()) / (1000 * 60 * 60);

        if (hoursSinceLast < 48) {
          // Keep the streak going (1 -> 2 -> ... 7 -> 8)
          // The Frontend % 7 logic handles the visual reset
          newStreak = user.streakCount + 1;
        } else {
          // Missed more than a day, reset to 1
          newStreak = 1;
        }
      } else {
        // First time ever checking in
        newStreak = 1;
      }
    }

    // 4. Calculate reward based on the 7-day cycle index (0 to 6)
    const cycleIndex = (newStreak - 1) % 7;
    const reward = asset === 'LAAM' ? LAAM_REWARDS[cycleIndex] : TAG_REWARDS[cycleIndex];

    // 5. Update Database
    const updatedUser = await prisma.user.update({
      where: { walletAddress },
      data: {
        [asset === 'LAAM' ? 'laamPoints' : 'tagTickets']: { increment: reward },
        [specificField]: now,
        lastCheckIn: now,
        streakCount: newStreak
      }
    });

    await logActivity(walletAddress, 'DAILY_CHECKIN' as any, reward, asset);

    return res.status(200).json({
      success: true,
      reward,
      asset,
      streakCount: newStreak, // Send back to update UI
      total: asset === 'LAAM' ? updatedUser.laamPoints : updatedUser.tagTickets
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Check-in failed" });
  }
}