import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { walletAddress, level, attemptCount, targetNumber, userGuess, action, checkOnly } = req.body;
  if (!walletAddress) return res.status(400).json({ message: 'Wallet address required' });

  try {
    let gameStatus = await prisma.guessGame.findUnique({ where: { userId: walletAddress } });

    if (action === 'claim') {
      if (!gameStatus || gameStatus.pendingPoints <= 0) return res.status(400).json({ message: "No points" });
      const pointsToClaim = gameStatus.pendingPoints;
      await prisma.$transaction([
        prisma.user.update({ where: { walletAddress }, data: { laamPoints: { increment: pointsToClaim } } }),
        prisma.guessGame.update({ where: { userId: walletAddress }, data: { pendingPoints: 0 } })
      ]);
      return res.status(200).json({ success: true, points: pointsToClaim });
    }

    const now = new Date();
    const LOCKOUT_DURATION = 6 * 60 * 60 * 1000;

    if (gameStatus?.isLocked) {
      const timePassed = now.getTime() - new Date(gameStatus.lastAttempt).getTime();
      if (timePassed < LOCKOUT_DURATION) {
        return res.status(403).json({ isLocked: true, pendingPoints: gameStatus.pendingPoints });
      } else {
        gameStatus = await prisma.guessGame.update({
          where: { userId: walletAddress },
          data: { isLocked: false, attempts: 0 }
        });
      }
    }

    if (checkOnly) return res.status(200).json({ isLocked: gameStatus?.isLocked || false, pendingPoints: gameStatus?.pendingPoints || 0 });

    const isWin = parseInt(userGuess) === targetNumber;

    if (isWin) {
      const rewards: Record<string, number[]> = { easy: [100, 50, 20], normal: [200, 100, 50], difficult: [500, 200, 100] };
      const pointsWon = rewards[level as string][attemptCount - 1] || 10;
      const updated = await prisma.guessGame.upsert({
        where: { userId: walletAddress },
        create: { userId: walletAddress, pendingPoints: pointsWon, attempts: 0 },
        update: { pendingPoints: { increment: pointsWon }, attempts: 0, isLocked: false, lastAttempt: now }
      });
      return res.status(200).json({ message: `Success! +${pointsWon} LAAM`, win: true, pendingPoints: updated.pendingPoints });
    }

    // --- UPDATED BLOCK: REVEAL NUMBER ON 3RD FAIL ---
    if (attemptCount >= 3) {
      await prisma.guessGame.upsert({
        where: { userId: walletAddress },
        create: { userId: walletAddress, attempts: 3, isLocked: true, lastAttempt: now },
        update: { attempts: 3, isLocked: true, lastAttempt: now }
      });
      return res.status(200).json({ 
        message: 'System Lockout.', 
        isLocked: true, 
        revealedNumber: targetNumber // Send the number back
      });
    }

    await prisma.guessGame.upsert({
      where: { userId: walletAddress },
      create: { userId: walletAddress, attempts: attemptCount, lastAttempt: now },
      update: { attempts: attemptCount, lastAttempt: now }
    });

    return res.status(200).json({ message: 'Incorrect frequency.' });
  } catch (error) {
    return res.status(500).json({ message: 'Error' });
  }
}