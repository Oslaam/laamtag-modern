import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { address, mintCount } = req.body;

  if (!address || !mintCount) return res.status(400).json({ error: "Missing data" });

  try {
    const rewardAmount = mintCount * 1000;

    // 1. Fetch the user to see if they have a recruiter
    const user = await prisma.user.findUnique({
      where: { walletAddress: address },
      select: { referredBy: true, walletAddress: true }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // 2. Atomic update to increment LAAM points for the MINTER
    const updatedUser = await prisma.user.update({
      where: { walletAddress: address },
      data: {
        laamPoints: { increment: rewardAmount },
      }
    });

    // 3. Log MINTER's reward in Activity table
    await prisma.activity.create({
      data: {
        userId: updatedUser.walletAddress,
        type: 'NFT_MINT_REWARD',
        asset: 'LAAM',
        amount: rewardAmount,
      }
    });

    // 4. REFERRAL PROGRESS LOGIC (For the Recruiter)
    if (user.referredBy) {
      await prisma.$transaction(async (tx) => {
        // Find recruiter's current stats
        const recruiter = await tx.user.findUnique({
          where: { walletAddress: user.referredBy! },
          select: { referralProgress: true }
        });

        if (recruiter) {
          const boost = 50 * mintCount; // 50% progress per NFT minted
          const newTotalProgress = recruiter.referralProgress + boost;

          // Calculate how many full crates (100%) were earned
          const newClaims = Math.floor(newTotalProgress / 100);
          const remainingProgress = newTotalProgress % 100;

          // Update the recruiter
          await tx.user.update({
            where: { walletAddress: user.referredBy! },
            data: {
              referralProgress: remainingProgress,
              claimableRewards: { increment: newClaims }
            }
          });

          // Log the activity for the recruiter
          await tx.activity.create({
            data: {
              userId: user.referredBy!,
              type: 'RECRUIT_MINT_BOOST',
              asset: 'PROGRESS',
              amount: boost,
            }
          });
        }
      });
    }

    return res.status(200).json({ success: true, earned: rewardAmount });
  } catch (error) {
    console.error("Reward Error:", error);
    return res.status(500).json({ error: "Failed to process reward" });
  }
}