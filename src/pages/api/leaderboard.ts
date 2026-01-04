import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma'; // Corrected Path (2 dots)
import { getRank } from '../../utils/ranks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;
  try {
    const topUsersRaw = await prisma.user.findMany({
      orderBy: { laamPoints: 'desc' },
      take: 10,
      include: { _count: { select: { quests: true } } }
    });

    const topUsers = topUsersRaw.map(user => ({
      ...user,
      tier: getRank(user.laamPoints).name,
      completedQuestsCount: user._count.quests
    }));

    let userRank = null;
    if (address) {
      const userData = await prisma.user.findUnique({
        where: { walletAddress: String(address) },
        include: { _count: { select: { quests: true } } }
      });
      
      if (userData) {
        const count = await prisma.user.count({
            where: { laamPoints: { gt: userData.laamPoints } }
        });
        userRank = {
          rank: count + 1,
          ...userData,
          tier: getRank(userData.laamPoints).name
        };
      }
    }
    res.status(200).json({ topUsers, userRank, lastUpdated: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
}