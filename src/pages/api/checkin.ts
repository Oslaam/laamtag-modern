import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma'; // Corrected Path (2 dots)

const REWARDS = [10, 10, 30, 40, 50, 50, 60];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { walletAddress } = req.body;
  const now = new Date();

  try {
    const user = await prisma.user.upsert({
      where: { walletAddress },
      create: { walletAddress, lastCheckIn: now, streakCount: 1, laamPoints: REWARDS[0] },
      update: {},
    });

    if (user.lastCheckIn) {
      const hoursSince = (now.getTime() - user.lastCheckIn.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) return res.status(400).json({ message: "Already checked in! Come back tomorrow." });

      let newStreak = hoursSince < 48 ? (user.streakCount % 7) + 1 : 1;
      const reward = REWARDS[newStreak - 1];

      const updatedUser = await prisma.user.update({
        where: { walletAddress },
        data: {
          laamPoints: { increment: reward },
          streakCount: newStreak,
          lastCheckIn: now,
        }
      });
      return res.status(200).json({ success: true, reward, total: updatedUser.laamPoints });
    }
    return res.status(200).json({ success: true, reward: REWARDS[0], total: user.laamPoints });
  } catch (e) {
    return res.status(500).json({ error: "Check-in failed" });
  }
}