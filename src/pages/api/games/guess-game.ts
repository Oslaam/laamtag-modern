import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { logActivity } from '../../../lib/activityLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const { walletAddress } = req.method === 'GET' ? req.query : req.body;
  if (!walletAddress) return res.status(400).json({ message: 'Wallet address required' });

  try {
    if (req.method === 'GET') {
      const game = await prisma.guessGame.findUnique({ where: { userId: walletAddress as string } });
      return res.status(200).json({
        pendingPoints: game?.pendingPoints || 0,
        isLocked: game?.isLocked || false,
        attempts: game?.attempts || 0,
        lastAttempt: game?.lastAttempt || null,
        revealedNumber: game?.isLocked ? game.currentTarget : null
      });
    }

    const { action, level, userGuess } = req.body;
    const user = await prisma.user.findUnique({ where: { walletAddress: walletAddress as string } });

    if (action === 'start') {
      if (!user || (user.tagTickets || 0) <= 0) {
        return res.status(403).json({ message: "No tickets remaining." });
      }

      const ranges = { easy: 20, normal: 50, difficult: 100 };
      const newTarget = Math.floor(Math.random() * ranges[level as keyof typeof ranges]) + 1;

      await prisma.$transaction([
        prisma.user.update({ where: { walletAddress: walletAddress as string }, data: { tagTickets: { decrement: 1 } } }),
        prisma.guessGame.upsert({
          where: { userId: walletAddress as string },
          create: { userId: walletAddress as string, currentTarget: newTarget, attempts: 0, isLocked: false },
          update: { currentTarget: newTarget, attempts: 0, isLocked: false }
        })
      ]);

      await logActivity(walletAddress as string, 'GAME_COST', -1, 'TAG');
      return res.status(200).json({ success: true });
    }

    if (action === 'claim') {
      const game = await prisma.guessGame.findUnique({ where: { userId: walletAddress as string } });
      if (!game || game.pendingPoints < 1000) {
        return res.status(400).json({ message: "Threshold of 1000 LAAM not met." });
      }

      const pointsToClaim = game.pendingPoints;
      await prisma.$transaction([
        prisma.user.update({ where: { walletAddress: walletAddress as string }, data: { laamPoints: { increment: pointsToClaim } } }),
        prisma.guessGame.update({ where: { userId: walletAddress as string }, data: { pendingPoints: 0 } })
      ]);

      await logActivity(walletAddress as string, 'GAME_WIN', pointsToClaim, 'LAAM');
      return res.status(200).json({ success: true });
    }

    const gameStatus = await prisma.guessGame.findUnique({ where: { userId: walletAddress as string } });
    if (!gameStatus || gameStatus.isLocked || gameStatus.currentTarget === null) {
      return res.status(400).json({ message: "Start a new game first." });
    }

    const isWin = parseInt(userGuess) === gameStatus.currentTarget;
    const currentAttempt = gameStatus.attempts + 1;

    if (isWin) {
      const rewards: Record<string, number[]> = {
        easy: [1000, 500, 200],
        normal: [2000, 1000, 500],
        difficult: [5000, 2000, 1000]
      };
      // Award points based on which attempt this was
      const pointsWon = rewards[level as string][gameStatus.attempts] || 10;

      const updated = await prisma.guessGame.update({
        where: { userId: walletAddress as string },
        data: { pendingPoints: { increment: pointsWon }, attempts: 0, currentTarget: null }
      });
      // WE NOW RETURN THE REVEALED NUMBER EVEN ON WIN
      return res.status(200).json({ win: true, message: "JAMMED!", pendingPoints: updated.pendingPoints, revealedNumber: gameStatus.currentTarget });
    }

    if (currentAttempt >= 3) {
      await prisma.guessGame.update({
        where: { userId: walletAddress as string },
        data: { isLocked: true, attempts: 3, lastAttempt: new Date() }
      });
      return res.status(200).json({ isLocked: true, win: false, revealedNumber: gameStatus.currentTarget });
    }

    await prisma.guessGame.update({ where: { userId: walletAddress as string }, data: { attempts: currentAttempt } });
    const hint = parseInt(userGuess) < gameStatus.currentTarget ? "HIGHER" : "LOWER";
    return res.status(200).json({ win: false, message: `Frequency is ${hint} than ${userGuess}`, attempts: currentAttempt });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
}