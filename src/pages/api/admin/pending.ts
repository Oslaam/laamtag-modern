import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, QuestStatus } from '@prisma/client';
import { isWalletAdmin } from '../../../lib/adminAuth';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminAddress = req.headers['x-admin-wallet'] as string;
  
  // Security check: Only wallets in your .env ADMIN_WALLETS list can fetch this
  if (!isWalletAdmin(adminAddress)) {
    return res.status(403).json({ error: "Unauthorized access" });
  }

  try {
    const submissions = await prisma.userQuest.findMany({
      where: { status: QuestStatus.PENDING },
      include: { 
        quest: true, // Gets Quest Title, Reward
        user: true   // Gets User's current laamPoints and Rank
      },
      // Uses the correct field name from your schema
      orderBy: { completedAt: 'desc' } 
    });

    res.status(200).json({ submissions });
  } catch (error) {
    console.error("Fetch Pending Error:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
}