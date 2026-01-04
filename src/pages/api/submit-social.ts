import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { walletAddress, questId, proofLink } = req.body;

  if (!proofLink || (!proofLink.includes('x.com') && !proofLink.includes('twitter.com'))) {
    return res.status(400).json({ message: "Please provide a valid X/Twitter link." });
  }

  try {
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
      message: "Submission received! Points will be added after manual verification." 
    });
  } catch (e) {
    return res.status(400).json({ message: "You already submitted this quest!" });
  }
}