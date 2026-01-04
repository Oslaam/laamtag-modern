import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Corrected Path

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: "Address required" });

  try {
    const history = await prisma.userQuest.findMany({
      where: { userId: String(address) },
      include: { quest: true },
      orderBy: { completedAt: 'desc' }
    });
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
}