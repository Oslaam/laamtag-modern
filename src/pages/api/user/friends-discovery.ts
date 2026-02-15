import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).end();

    const { exclude } = req.query;
    if (!exclude) return res.status(400).json({ error: "Missing address" });

    try {
        // 1. Get IDs of people you are already connected with or pending
        const existingLinks = await prisma.friendship.findMany({
            where: {
                OR: [
                    { senderId: exclude as string },
                    { receiverId: exclude as string }
                ]
            },
            select: {
                senderId: true,
                receiverId: true
            }
        });

        const connectedAddresses = existingLinks.flatMap(l => [l.senderId, l.receiverId]);
        connectedAddresses.push(exclude as string);

        // 2. Fetch users not in that list
        const users = await prisma.user.findMany({
            where: {
                walletAddress: {
                    notIn: connectedAddresses
                }
            },
            select: {
                walletAddress: true,
                username: true,
                rank: true,
                laamPoints: true, // Needed to determine rank color on frontend
            },
            take: 10,
            orderBy: {
                laamPoints: 'desc',
            },
        });

        return res.status(200).json(users);
    } catch (error) {
        console.error("Discovery API Error:", error);
        return res.status(500).json({ error: "Failed to fetch discovery list" });
    }
}