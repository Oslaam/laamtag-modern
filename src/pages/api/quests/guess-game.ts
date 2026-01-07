import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const { walletAddress } = req.method === 'GET' ? req.query : req.body;
  if (!walletAddress) return res.status(400).json({ message: 'Wallet address required' });

  try {
    // --- GET: Fetch Game State (Persistence) ---
    if (req.method === 'GET') {
      const game = await prisma.guessGame.findUnique({ where: { userId: walletAddress as string } });
      return res.status(200).json({
        pendingPoints: game?.pendingPoints || 0,
        isLocked: game?.isLocked || false,
        attempts: game?.attempts || 0
      });
    }

    const { action, level, userGuess } = req.body;
    const user = await prisma.user.findUnique({ where: { walletAddress: walletAddress as string } });

    // --- ACTION: START (Charge Ticket & Generate Number) ---
    if (action === 'start') {
      if (!user || (user.tagTickets || 0) <= 0) {
        return res.status(403).json({ message: "No tickets remaining." });
      }

      const ranges = { easy: 20, normal: 50, difficult: 100 };
      const newTarget = Math.floor(Math.random() * ranges[level as keyof typeof ranges]) + 1;

      await prisma.$transaction([
        prisma.user.update({ where: { walletAddress }, data: { tagTickets: { decrement: 1 } } }),
        prisma.guessGame.upsert({
          where: { userId: walletAddress },
          create: { userId: walletAddress, currentTarget: newTarget, attempts: 0, isLocked: false },
          update: { currentTarget: newTarget, attempts: 0, isLocked: false }
        })
      ]);
      return res.status(200).json({ success: true });
    }

    // --- ACTION: CLAIM (The 1000 LAAM Threshold) ---
    if (action === 'claim') {
      const game = await prisma.guessGame.findUnique({ where: { userId: walletAddress } });
      if (!game || game.pendingPoints < 1000) {
        return res.status(400).json({ message: "Threshold of 1000 LAAM not met." });
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { walletAddress },
          data: { laamPoints: { increment: game.pendingPoints } }
        }),
        prisma.guessGame.update({
          where: { userId: walletAddress },
          data: { pendingPoints: 0 }
        })
      ]);
      return res.status(200).json({ success: true });
    }

    // --- ACTION: GUESS (Secure validation) ---
    const gameStatus = await prisma.guessGame.findUnique({ where: { userId: walletAddress } });
    if (!gameStatus || gameStatus.isLocked || gameStatus.currentTarget === null) {
      return res.status(400).json({ message: "Start a new game first." });
    }

    const isWin = parseInt(userGuess) === gameStatus.currentTarget;
    const currentAttempt = gameStatus.attempts + 1;

    if (isWin) {
      const rewards: Record<string, number[]> = {
        easy: [100, 50, 20],
        normal: [200, 100, 50],
        difficult: [500, 200, 100]
      };
      const pointsWon = rewards[level as string][gameStatus.attempts] || 10;

      const updated = await prisma.guessGame.update({
        where: { userId: walletAddress },
        data: { pendingPoints: { increment: pointsWon }, attempts: 0, currentTarget: null }
      });
      return res.status(200).json({ win: true, message: "JAMMED!", pendingPoints: updated.pendingPoints });
    }

    // Handle Lockout after 3 tries
    if (currentAttempt >= 3) {
      await prisma.guessGame.update({
        where: { userId: walletAddress },
        data: { isLocked: true, attempts: 3, lastAttempt: new Date() }
      });
      return res.status(200).json({ isLocked: true, revealedNumber: gameStatus.currentTarget });
    }

    // Save failed attempt count
    await prisma.guessGame.update({ where: { userId: walletAddress }, data: { attempts: currentAttempt } });
    const hint = parseInt(userGuess) < gameStatus.currentTarget ? "HIGHER" : "LOWER";
    return res.status(200).json({
      win: false,
      message: `Frequency is ${hint} than ${userGuess}`,
      attempts: currentAttempt
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
}