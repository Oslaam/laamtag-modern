import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { getRank } from '../../utils/ranks';
import { logActivity } from '../../lib/activityLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { walletAddress, questId, pointsReward, referralCodeUsed } = req.body;

  try {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });

    if (!quest) return res.status(404).json({ message: "Quest not found" });

    // --- EXPIRATION CHECK (3 DAYS) ---
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const questAge = Date.now() - new Date(quest.createdAt).getTime();

    if (questAge > THREE_DAYS_MS) {
      return res.status(400).json({ message: "Intelligence expired! This mission is no longer active." });
    }
    // ---------------------------------

    if (quest.limit && quest.claimedCount >= quest.limit) {
      return res.status(400).json({ message: "This special task is full!" });
    }

    const isTagQuest = questId === 'tag-daily-checkin';
    const currentUser = await prisma.user.findUnique({ where: { walletAddress } });

    let referrerWallet: string | null = null;
    if (!currentUser && referralCodeUsed && referralCodeUsed !== "LAAM-2026-TAG") {
      const recruiter = await prisma.user.findUnique({
        where: { referralCode: referralCodeUsed }
      });
      referrerWallet = recruiter?.walletAddress || null;
    }

    let updateData: any = {};
    let createData: any = {
      walletAddress,
      hasAccess: true,
      referredBy: referrerWallet,
      referralCode: `TAG-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    };

    if (isTagQuest) {
      updateData = { tagTickets: { increment: pointsReward } };
      createData = { ...createData, tagTickets: pointsReward };
    } else {
      const newTotalPoints = (currentUser?.laamPoints || 0) + pointsReward;
      const newTier = getRank(newTotalPoints).name;

      updateData = { laamPoints: { increment: pointsReward }, rank: newTier };
      createData = { ...createData, laamPoints: pointsReward, rank: newTier };
    }

    const [user] = await prisma.$transaction([
      prisma.user.upsert({
        where: { walletAddress },
        update: updateData,
        create: createData,
      }),
      prisma.userQuest.create({
        data: { userId: walletAddress, questId: questId, status: "APPROVED" },
      }),
      prisma.quest.update({
        where: { id: questId },
        data: { claimedCount: { increment: 1 } }
      })
    ]);

    const currencyLabel = isTagQuest ? 'TAG' : 'LAAM';
    await logActivity(walletAddress, 'QUEST_REWARD', pointsReward, currencyLabel);

    return res.status(200).json({
      success: true,
      message: `Reward claimed: ${pointsReward} ${currencyLabel}`,
      newPoints: user.laamPoints,
      newTag: user.tagTickets
    });

  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ message: 'Quest already completed' });
    return res.status(500).json({ error: error.message });
  }
}