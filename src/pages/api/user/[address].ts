import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Corrected Path

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;
  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: address as string },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Database error' });
  }
}