import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).end();

    const { walletAddress } = req.query;
    if (!walletAddress) return res.status(400).json({ error: "Address required" });

    try {
        const friendships = await prisma.friendship.findMany({
            where: {
                OR: [
                    { senderId: walletAddress as string },
                    { receiverId: walletAddress as string }
                ],
                status: 'ACCEPTED'
            },
            include: {
                sender: { select: { walletAddress: true, username: true, rank: true } },
                receiver: { select: { walletAddress: true, username: true, rank: true } }
            }
        });

        // Map results to return friend info PLUS the streak data from the friendship relation
        const friends = friendships.map(f => {
            const isSender = f.senderId === walletAddress;
            const friendInfo = isSender ? f.receiver : f.sender;

            return {
                ...friendInfo,
                streak: f.streak,
                lastPokedBy: f.lastPokedBy,
                lastPokeAt: f.lastPokeAt
            };
        });

        return res.status(200).json({ success: true, friends });
    } catch (error) {
        console.error("List API Error:", error);
        return res.status(500).json({ error: "Failed to fetch friends" });
    }
}