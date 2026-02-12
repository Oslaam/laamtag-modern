import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: address },
      select: {
        username: true,
        laamPoints: true,
        tagTickets: true,
        rank: true,
        personalMinted: true,
        hasResistanceUnlocked: true,
        referralCode: true,
        referredBy: true,
        hasAccess: true,
        isAdmin: true,
        _count: {
          select: { referrals: true }
        }
      }
    });

    if (!user) {
      return res.status(200).json({
        username: null,
        laamPoints: 0,
        tagTickets: 0,
        rank: "UNRANKED",
        hasAccess: false,
        isAdmin: false,
        stakedCount: 0,
        hasDomain: false,
        isEligibleFree: false,
        referralProgress: 0,
        claimableRewards: 0
      });
    }

    // --- RECRUITMENT CALCULATION ---
    const recruitsCount = user._count?.referrals || 0;
    const recruitsNeededPerCrate = 10; // Every 10 recruits = 1 Crate

    // Progress toward the NEXT crate (e.g., 1 recruit = 10%)
    const referralProgress = (recruitsCount % recruitsNeededPerCrate) * 10;

    // Total crates earned but not yet claimed 
    // (Note: This assumes your DB logic handles 'claimed' status, 
    // otherwise this just shows total earned crates based on recruit count)
    const claimableRewards = Math.floor(recruitsCount / recruitsNeededPerCrate);

    // Count staked NFTs
    const stakedCount = await prisma.stakedNFT.count({
      where: { ownerAddress: address }
    });

    return res.status(200).json({
      ...user,
      stakedCount,
      hasDomain: !!user.username,
      isEligibleFree: stakedCount > 0,
      hasAccess: user.hasAccess || user.isAdmin,
      // Add these two fields to make the progress bar move
      referralProgress,
      claimableRewards
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch user data" });
  }
}