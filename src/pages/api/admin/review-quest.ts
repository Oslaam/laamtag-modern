import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, QuestStatus } from '@prisma/client';
import { verifyAdminSignature } from '../../../lib/adminAuth'; 

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { submissionId, action, signature, address, message } = req.body;

  // 1. SECURITY: Cryptographic verify that an Admin wallet signed this specific request
  const isValid = verifyAdminSignature(address, signature, message);
  if (!isValid) return res.status(401).json({ error: "Invalid Admin Signature" });

  try {
    const submission = await prisma.userQuest.findUnique({
      where: { id: submissionId },
      include: { quest: true }
    });

    if (!submission) return res.status(404).json({ error: "Submission not found" });

    if (action === 'APPROVE') {
      // 2. Mark as Approved using Enum
      await prisma.userQuest.update({
        where: { id: submissionId },
        data: { status: QuestStatus.APPROVED } 
      });

      // 3. Grant Points
      await prisma.user.update({
        where: { walletAddress: submission.userId },
        data: { laamPoints: { increment: submission.quest.reward } }
      });

      return res.status(200).json({ message: "Approved and points granted" });
    } else {
      // 4. Mark as Rejected (Keeps history so they don't spam the same link)
      await prisma.userQuest.update({ 
        where: { id: submissionId },
        data: { status: QuestStatus.REJECTED } 
      });
      return res.status(200).json({ message: "Submission rejected" });
    }
  } catch (error) {
    console.error("Review Error:", error);
    res.status(500).json({ error: "Review process failed" });
  }
}