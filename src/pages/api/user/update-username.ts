import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { walletAddress, username } = req.body;

  if (!walletAddress || !username) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // 1. Clean the name
  const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15);

  if (cleanUsername.length < 3) {
    return res.status(400).json({ message: 'Username too short' });
  }

  try {
    // 2. CHECK: Is someone else already using this name?
    const existing = await prisma.user.findFirst({
      where: {
        username: { equals: cleanUsername, mode: 'insensitive' },
        NOT: { walletAddress: walletAddress } // Ignore if the owner is the one saving it
      }
    });

    if (existing) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // 3. UPDATE: Safe to save
    const updatedUser = await prisma.user.update({
      where: { walletAddress: walletAddress },
      data: { username: cleanUsername },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ message: 'Failed to update username' });
  }
}