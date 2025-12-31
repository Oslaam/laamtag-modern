import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const allQuests = await prisma.quest.findMany();
    
    // Filter quests that haven't hit their limit yet
    const activeCount = allQuests.filter(q => {
      if (!q.limit) return true; // No limit means always active
      return q.claimedCount < q.limit;
    }).length;

    res.status(200).json({ count: activeCount });
  } catch (error) {
    res.status(500).json({ error: "Failed to count quests" });
  }
}