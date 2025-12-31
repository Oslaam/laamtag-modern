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
  const { address } = req.query;

  try {
    const topUsersRaw = await prisma.user.findMany({
      orderBy: { laamPoints: 'desc' },
      take: 10,
      // CHANGE 'completed' TO 'quests' to match your schema
      include: {
        _count: {
          select: { quests: true }
        }
      }
    });

    const topUsers = topUsersRaw.map(user => ({
      ...user,
      tier: getTier(user.laamPoints),
      // Map the count back to a friendly name for your frontend
      completedQuestsCount: user._count.quests
    }));

    let userRank = null;
    if (address) {
      const allUsers = await prisma.user.findMany({
        orderBy: { laamPoints: 'desc' },
        select: { walletAddress: true }
      });

      const index = allUsers.findIndex(u => u.walletAddress === address);
      if (index !== -1) {
        const userData = await prisma.user.findUnique({
          where: { walletAddress: String(address) },
          include: { _count: { select: { quests: true } } }
        });
        userRank = {
          rank: index + 1,
          ...userData,
          tier: getTier(userData?.laamPoints || 0)
        };
      }
    }

    res.status(200).json({
      topUsers,
      userRank,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
}