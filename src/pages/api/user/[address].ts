import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: address },
      select: {
        username: true,
        laamPoints: true,
        tagTickets: true,
        rank: true,
        personalMinted: true,
        warriorMinted: true,
        lastCheckIn: true,
        hasPaidDiceEntry: true,
        hasResistanceUnlocked: true,
        hasPulseHunterUnlocked: true,
        hasPlinkoUnlocked: true,
        referralCode: true,
        referredBy: true,
        hasAccess: true,
        isAdmin: true,
        streakCount: true,
        claimedBadges: {
          select: {
            badge: {
              select: {
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            referrals: true,
            quests: { where: { status: 'COMPLETED' } },
            boosts: true
          }
        }
      }
    });

    if (!user) {
      return res.status(200).json({
        username: null,
        laamPoints: 0,
        tagTickets: 0,
        rank: "UNRANKED",
        hasAccess: false,
        isAdmin: false,
        stakedCount: 0,
        hasDomain: false,
        isEligibleFree: false,
        referralProgress: 0,
        claimableRewards: 0,
        claimedBadges: [],
        completedQuestsCount: 0,
        purchasedBoostsCount: 0,
        friendsCount: 0
      });
    }

    const friendsCount = await prisma.friendship.count({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: address },
          { receiverId: address }
        ]
      }
    });

    const recruitsCount = user._count?.referrals || 0;
    const recruitsNeededPerCrate = 10;
    const referralProgress = (recruitsCount % recruitsNeededPerCrate) * 10;
    const claimableRewards = Math.floor(recruitsCount / recruitsNeededPerCrate);

    const stakedCount = await prisma.stakedNFT.count({
      where: { ownerAddress: address }
    });

    return res.status(200).json({
      ...user,
      stakedCount,
      friendsCount,
      hasDomain: !!user.username,
      isEligibleFree: stakedCount > 0,
      hasAccess: user.hasAccess || user.isAdmin,
      referralProgress,
      claimableRewards,
      completedQuestsCount: user._count?.quests || 0,
      purchasedBoostsCount: user._count?.boosts || 0
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch user data" });
  }
}