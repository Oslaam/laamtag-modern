import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { walletAddress, questId, proofLink } = req.body;

  if (!proofLink || (!proofLink.includes('x.com') && !proofLink.includes('twitter.com'))) {
    return res.status(400).json({ message: "Please provide a valid X/Twitter link." });
  }

  try {
    // Record the submission as PENDING. 
    // Points are NOT added here. They are added in review-quest.ts by the Admin.
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