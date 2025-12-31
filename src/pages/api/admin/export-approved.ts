import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, QuestStatus } from '@prisma/client';
import { isAdmin, isWalletAdmin } from '../../../lib/adminAuth';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminAddress = req.headers['x-admin-wallet'] as string;

  // Security check
  if (!isWalletAdmin(adminAddress)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const approvedSubmissions = await prisma.userQuest.findMany({
      where: { status: QuestStatus.APPROVED },
      include: { quest: true },
      orderBy: { completedAt: 'desc' }
    });

    // Format the data for CSV
    const csvRows = [
      ["Wallet Address", "Quest Title", "Reward (LAAM)", "Date Approved"], 
      ...approvedSubmissions.map(sub => [
        sub.userId,
        sub.quest.title,
        sub.quest.reward,
        sub.completedAt.toISOString()
      ])
    ];

    const csvContent = csvRows.map(row => row.join(",")).join("\n");

    // Browser download headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=laam_approved_exports.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({ error: "Failed to export data" });
  }
}