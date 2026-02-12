import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const quests = await prisma.quest.findMany({
      orderBy: {
        createdAt: 'desc' // Shows newest quests at the top
      }
    });
    res.status(200).json(quests);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch quests" });
  }
}