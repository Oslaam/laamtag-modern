import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: address as string },
      select: {
        username: true,
        laamPoints: true,
        tagTickets: true,
        rank: true,
        personalMinted: true,
        hasResistanceUnlocked: true, // Added this
      }
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Count staked NFTs to determine "Free Mint" eligibility
    const stakedCount = await prisma.stakedNFT.count({
      where: { ownerAddress: address as string }
    });

    // Return everything the frontend needs
    return res.status(200).json({
      ...user,
      stakedCount,
      hasDomain: !!user.username,
      isEligibleFree: stakedCount > 0,
      hasResistanceUnlocked: user.hasResistanceUnlocked // Explicitly return the unlock status
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
}