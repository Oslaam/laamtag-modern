import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { walletAddress, questId, proofLink } = req.body;

  try {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) return res.status(404).json({ message: "Quest not found." });

    if (quest.type === 'social') {
      if (!proofLink || (!proofLink.includes('x.com') && !proofLink.includes('twitter.com'))) {
        return res.status(400).json({ message: "Please provide a valid X/Twitter link." });
      }
    } else if (quest.type === 'social_any_link') {
      if (!proofLink || !proofLink.startsWith('http')) {
        return res.status(400).json({ message: "Please provide a valid URL link." });
      }
    } else if (quest.type === 'social_username') {
      if (!proofLink || proofLink.length < 3) {
        return res.status(400).json({ message: "Please enter a valid username/handle." });
      }
    }

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
      message: "Submission received! Points added after manual verification."
    });
  } catch (e) {
    return res.status(400).json({ message: "You already submitted this quest!" });
  }
}