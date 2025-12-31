import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const getTier = (points: number) => {
    if (points >= 20000) return "Diamond";
    if (points >= 10001) return "Gold";
    if (points >= 5001) return "Silver";
    return "Bronze";
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const { walletAddress, questId, pointsReward } = req.body;

  try {
    // 1. Check Quest Limits
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (quest?.limit && quest.claimedCount >= quest.limit) {
      return res.status(400).json({ message: "This special task is full!" });
    }

    // 2. Update User & Calculate Tier
    const currentUser = await prisma.user.findUnique({ where: { walletAddress } });
    const newTotalPoints = (currentUser?.laamPoints || 0) + pointsReward;
    const newTier = getTier(newTotalPoints);

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

    // 3. Record Completion
    await prisma.userQuest.create({
      data: { userId: walletAddress, questId: questId, status: "APPROVED" },
    });

    // 4. Update Quest claimedCount
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