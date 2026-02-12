import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // ADDED: referralCodeUsed
  const { walletAddress, questId, proofLink, referralCodeUsed } = req.body;

  try {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) return res.status(404).json({ message: "Quest not found." });

    // 1. Check if User exists, if not, REGISTER THEM
    let user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) {
      let referrerWallet = null;
      if (referralCodeUsed && referralCodeUsed !== "LAAM-2026-TAG") {
        const recruiter = await prisma.user.findUnique({ where: { referralCode: referralCodeUsed } });
        referrerWallet = recruiter?.walletAddress || null;
      }
      await prisma.user.create({
        data: {
          walletAddress,
          hasAccess: true,
          referredBy: referrerWallet,
          referralCode: `TAG-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
        }
      });
    }

    // 2. Validate Link Types
    if (quest.type === 'social' && (!proofLink?.includes('x.com') && !proofLink?.includes('twitter.com'))) {
      return res.status(400).json({ message: "Please provide a valid X/Twitter link." });
    }

    // 3. Create the Quest Entry (Status PENDING)
    await prisma.userQuest.create({
      data: {
        userId: walletAddress,
        questId: questId,
        proofLink: proofLink,
        status: "PENDING"
      }
    });

    return res.status(200).json({
      success: true,
      message: "Submission received! Verification pending."
    });
  } catch (e) {
    return res.status(400).json({ message: "Submission already exists for this mission." });
  }
}