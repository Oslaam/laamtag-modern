import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { getRank } from '../../utils/ranks'; // <--- FIXED PATH

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const { walletAddress, questId, pointsReward } = req.body;

  try {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (quest?.limit && quest.claimedCount >= quest.limit) {
      return res.status(400).json({ message: "This special task is full!" });
    }

    const currentUser = await prisma.user.findUnique({ where: { walletAddress } });
    const newTotalPoints = (currentUser?.laamPoints || 0) + pointsReward;
    const newTier = getRank(newTotalPoints).name;

    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: {
        laamPoints: { increment: pointsReward },
        rank: newTier // Storing the Tier here
      },
      create: {
        walletAddress,
        laamPoints: pointsReward,
        rank: newTier
      },
    });

    // Record Completion
    await prisma.userQuest.create({
      data: { userId: walletAddress, questId: questId, status: "APPROVED" },
    });

    // Update Quest claimedCount
    await prisma.quest.update({
      where: { id: questId },
      data: { claimedCount: { increment: 1 } }
    });

    return res.status(200).json({ success: true, newPoints: user.laamPoints });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ message: 'Quest already completed' });
    return res.status(500).json({ error: error.message });
  }
}