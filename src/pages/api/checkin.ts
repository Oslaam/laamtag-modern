import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { logActivity } from '../../lib/activityLogger';

const LAAM_REWARDS = [100, 100, 300, 400, 500, 500, 600];
const TAG_REWARDS = [1, 1, 1, 2, 1, 1, 2];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // ADDED: referralCodeUsed
  const { walletAddress, asset, referralCodeUsed } = req.body;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    let user = await prisma.user.findUnique({ where: { walletAddress } });

    // --- NEW: AUTO-REGISTRATION LOGIC ---
    if (!user) {
      let referrerWallet = null;
      if (referralCodeUsed && referralCodeUsed !== "LAAM-2026-TAG") {
        const recruiter = await prisma.user.findUnique({ where: { referralCode: referralCodeUsed } });
        referrerWallet = recruiter?.walletAddress || null;
      }

      user = await prisma.user.create({
        data: {
          walletAddress,
          hasAccess: true,
          referredBy: referrerWallet,
          referralCode: `TAG-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
        }
      });
    }

    const specificField = asset === 'LAAM' ? 'lastLaamCheckIn' : 'lastTagCheckIn';
    const lastSpecificDate = user[specificField];

    if (lastSpecificDate && new Date(lastSpecificDate) >= todayMidnight) {
      return res.status(400).json({ message: `Daily ${asset} already secured!` });
    }

    const lastOverallCheckIn = user.lastCheckIn;
    const isAlreadyActiveToday = lastOverallCheckIn && new Date(lastOverallCheckIn) >= todayMidnight;
    let newStreak = user.streakCount;

    if (!isAlreadyActiveToday) {
      if (lastOverallCheckIn) {
        const hoursSinceLast = (now.getTime() - new Date(lastOverallCheckIn).getTime()) / (1000 * 60 * 60);
        newStreak = hoursSinceLast < 48 ? user.streakCount + 1 : 1;
      } else {
        newStreak = 1;
      }
    }

    const cycleIndex = (newStreak - 1) % 7;
    const reward = asset === 'LAAM' ? LAAM_REWARDS[cycleIndex] : TAG_REWARDS[cycleIndex];

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
      streakCount: newStreak,
      total: asset === 'LAAM' ? updatedUser.laamPoints : updatedUser.tagTickets
    });

  } catch (e) {
    return res.status(500).json({ error: "Check-in failed" });
  }
}