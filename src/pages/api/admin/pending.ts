import { NextApiRequest, NextApiResponse } from 'next';
import { QuestStatus } from '@prisma/client';
import prisma from '../../../lib/prisma'; // Corrected Path
import { isWalletAdmin } from '../../../lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminAddress = req.headers['x-admin-wallet'] as string;
  if (!isWalletAdmin(adminAddress)) return res.status(403).json({ error: "Unauthorized access" });

  try {
    const submissions = await prisma.userQuest.findMany({
      where: { status: QuestStatus.PENDING },
      include: { quest: true, user: true },
      orderBy: { completedAt: 'desc' }
    });
    res.status(200).json({ submissions });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
}