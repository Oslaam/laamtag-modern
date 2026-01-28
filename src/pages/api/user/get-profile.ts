import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ message: "Address is required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: address },
      select: {
        lastLaamCheckIn: true,
        lastTagCheckIn: true,
        laamPoints: true,
        tagTickets: true,
        streakCount: true,
      }
    });

    // If user is new, send back nulls instead of an error
    if (!user) {
      return res.status(200).json({
        lastLaamCheckIn: null,
        lastTagCheckIn: null,
        laamPoints: 0,
        tagTickets: 0,
        streakCount: 0
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}