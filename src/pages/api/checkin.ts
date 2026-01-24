import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { logActivity } from '../../lib/activityLogger';

const LAAM_REWARDS = [100, 100, 300, 400, 500, 500, 600];
const TAG_REWARDS = [1, 1, 1, 2, 1, 1, 2];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { walletAddress, asset } = req.body; // asset is 'LAAM' or 'TAG'
  const now = new Date();

  try {
    const user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const field = asset === 'LAAM' ? 'lastLaamCheckIn' : 'lastTagCheckIn';
    const lastDate = user[field] as Date | null;

    if (lastDate) {
      const hoursSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        return res.status(400).json({ message: `Daily ${asset} already claimed!` });
      }
    }

    // Streak logic (shared or separate, here we use the shared streakCount)
    // Reset streak if more than 48h since the LAST overall check-in
    const lastCheckIn = user.lastCheckIn;
    let newStreak = 1;
    if (lastCheckIn) {
      const hoursSinceLast = (now.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60);
      newStreak = hoursSinceLast < 48 ? (user.streakCount % 7) + 1 : 1;
    }

    const reward = asset === 'LAAM' ? LAAM_REWARDS[newStreak - 1] : TAG_REWARDS[newStreak - 1];

    const updatedUser = await prisma.user.update({
      where: { walletAddress },
      data: {
        [asset === 'LAAM' ? 'laamPoints' : 'tagTickets']: { increment: reward },
        [field]: now,
        lastCheckIn: now, // Update main check-in for streak tracking
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
    return res.status(500).json({ error: "Check-in failed" });
  }
}