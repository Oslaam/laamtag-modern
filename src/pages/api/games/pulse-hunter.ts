import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        // Handle GET for initial state loading
        if (req.method === 'GET') {
            const { walletAddress } = req.query;
            const game = await prisma.pulseHunterGame.findUnique({ where: { userId: String(walletAddress) } });
            return res.status(200).json(game);
        }
        return res.status(405).end();
    }

    const { walletAddress, action, userGuess } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { walletAddress } });
        if (!user) return res.status(404).json({ message: "ACCESS DENIED: USER UNKNOWN" });

        let game = await prisma.pulseHunterGame.findUnique({ where: { userId: walletAddress } });

        // SECURITY: 2-Hour Cooldown Logic
        const cooldownTime = 2 * 60 * 60 * 1000;
        const now = new Date();
        const lastAttemptTime = game?.lastAttempt ? new Date(game.lastAttempt).getTime() : 0;
        const isExpired = (Date.now() - lastAttemptTime) > cooldownTime;

        // If the game is locked but 2 hours passed, or it's a first-time player
        if (!game || (isExpired && game.isLocked)) {
            game = await prisma.pulseHunterGame.upsert({
                where: { userId: walletAddress },
                create: {
                    userId: walletAddress,
                    currentTarget: Math.floor(Math.random() * 100) + 1,
                    attempts: 0,
                    isLocked: false
                },
                update: {
                    currentTarget: Math.floor(Math.random() * 100) + 1,
                    attempts: 0,
                    isLocked: false,
                    lastAttempt: new Date(0) // Reset clock for new session
                }
            });
        }

        if (action === 'guess') {
            // SECURITY: Prevent API spamming if already locked
            if (game.isLocked && !isExpired) {
                return res.status(403).json({ message: "SYSTEM RECALIBRATING. ACCESS DENIED." });
            }

            const guessNum = parseInt(userGuess);
            if (isNaN(guessNum) || guessNum < 1 || guessNum > 100) {
                return res.status(400).json({ message: "INVALID SIGNAL: RANGE 1-100 ONLY" });
            }

            const currentAttempt = game.attempts + 1;
            const isWin = guessNum === game.currentTarget;

            if (isWin) {
                const rewards = [1000, 500, 100];
                const prize = rewards[game.attempts] || 50;

                await prisma.$transaction([
                    prisma.pulseHunterGame.update({
                        where: { userId: walletAddress },
                        data: { isLocked: true, lastAttempt: now, attempts: currentAttempt }
                    }),
                    prisma.pendingReward.create({
                        data: { userId: walletAddress, asset: 'SKR', amount: prize, type: 'GAME_WIN' }
                    }),
                    prisma.activity.create({
                        data: { userId: walletAddress, asset: 'SKR', amount: prize, type: 'PULSE_HUNTER_WIN' }
                    })
                ]);
                return res.status(200).json({ win: true, prize, attemptUsed: currentAttempt });
            }

            // Lose Logic (After 3 attempts)
            if (currentAttempt >= 3) {
                await prisma.pulseHunterGame.update({
                    where: { userId: walletAddress },
                    data: { isLocked: true, lastAttempt: now, attempts: 3 }
                });
                return res.status(200).json({
                    win: false,
                    message: `SIGNAL LOST. TARGET WAS: ${game.currentTarget}`,
                    locked: true,
                    attempts: 3
                });
            }

            // Wrong Guess but attempts remaining - Update count and give hint
            await prisma.pulseHunterGame.update({
                where: { userId: walletAddress },
                data: { attempts: currentAttempt }
            });

            const hint = guessNum < game.currentTarget ? "HIGHER" : "LOWER";
            return res.status(200).json({ win: false, message: hint, attempts: currentAttempt });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "INTERNAL SERVER ERROR" });
    }
}