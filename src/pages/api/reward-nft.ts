import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { address, mintCount } = req.body;

  if (!address || !mintCount) return res.status(400).json({ error: "Missing data" });

  try {
    const rewardAmount = mintCount * 1000;

    // 1. Atomic update to increment LAAM points
    const updatedUser = await prisma.user.update({
      where: { walletAddress: address },
      data: {
        laamPoints: { increment: rewardAmount },
      }
    });

    // 2. Log in Activity table (Matching your schema fields)
    await prisma.activity.create({
      data: {
        userId: updatedUser.walletAddress, // Using walletAddress as the foreign key
        type: 'NFT_MINT_REWARD',
        asset: 'LAAM',
        amount: rewardAmount,
      }
    });

    return res.status(200).json({ success: true, earned: rewardAmount });
  } catch (error) {
    console.error("Reward Error:", error);
    return res.status(500).json({ error: "Failed to process reward" });
  }
}