// src/pages/api/user/update-username.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Using your existing prisma import

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { walletAddress, username } = req.body;

  if (!walletAddress || !username) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // 1. Separate core name from suffix
  // Input could be "Alice" or "alice.laam"
  const coreName = username.replace('.laam', '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const finalUsername = `${coreName}.laam`;

  if (coreName.length < 3) {
    return res.status(400).json({ message: 'Name too short (min 3 chars)' });
  }

  try {
    // 2. CHECK: Is someone else already using this name?
    const existing = await prisma.user.findFirst({
      where: {
        username: finalUsername,
        NOT: { walletAddress: walletAddress }
      }
    });

    if (existing) return res.status(400).json({ message: 'Domain already taken' });

    // 3. UPDATE: Save with the full suffix
    const updatedUser = await prisma.user.update({
      where: { walletAddress: walletAddress },
      data: { username: finalUsername },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ message: 'Failed to update username' });
  }
}