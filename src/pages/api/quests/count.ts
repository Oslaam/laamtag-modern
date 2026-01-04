import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Corrected Path

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const allQuests = await prisma.quest.findMany();
    const activeCount = allQuests.filter(q => {
      if (!q.limit) return true;
      return q.claimedCount < q.limit;
    }).length;
    res.status(200).json({ count: activeCount });
  } catch (error) {
    res.status(500).json({ error: "Failed to count quests" });
  }
}