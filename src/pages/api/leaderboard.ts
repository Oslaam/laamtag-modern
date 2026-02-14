import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { getRank } from '../../utils/ranks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;
  try {
    // Fetch top users by points AND include the count of people they referred
    const topUsersRaw = await prisma.user.findMany({
      orderBy: { laamPoints: 'desc' },
      take: 50, // Let's take 50 so the Recruiter logic has more data to work with
      select: {
        walletAddress: true,
        username: true, // Make sure this is here!
        laamPoints: true,
        _count: {
          select: {
            quests: true,
            referrals: true
          }
        }
      }
    });

    const topUsers = topUsersRaw.map(user => ({
      ...user,
      tier: getRank(user.laamPoints).name,
      completedQuestsCount: user._count.quests,
      referralCount: user._count.referrals // Map the count to the field your frontend expects
    }));

    let userRank = null;
    if (address) {
      const userData = await prisma.user.findUnique({
        where: { walletAddress: String(address) },
        include: {
          _count: {
            select: {
              quests: true,
              referrals: true
            }
          }
        }
      });

      if (userData) {
        const count = await prisma.user.count({
          where: { laamPoints: { gt: userData.laamPoints } }
        });
        userRank = {
          rank: count + 1,
          ...userData,
          tier: getRank(userData.laamPoints).name,
          referralCount: userData._count.referrals // Include for the logged-in user too
        };
      }
    }

    res.status(200).json({ topUsers, userRank, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
}