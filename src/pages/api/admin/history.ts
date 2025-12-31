import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { isAdmin } from '../../../lib/adminAuth';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await isAdmin(req))) return res.status(401).json({ error: "Unauthorized" });

  // ... imports
  try {
    const history = await prisma.userQuest.findMany({
      where: {
        status: { in: ['APPROVED', 'REJECTED'] }
      },
      include: {
        quest: true,
        user: true
      },
      orderBy: { updatedAt: 'desc' }, // This will work now!
      take: 20
    });
    res.status(200).json({ history });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
}