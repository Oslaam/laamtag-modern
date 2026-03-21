import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
        return res.status(400).json({ message: "Address is required" });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { walletAddress: address },
            include: {
                activities: true,

                claimedBadges: {
                    select: {
                        badgeId: true,
                        badge: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                // 2. Fetch counts so the eligibility logic quests/boosts
                _count: {
                    select: {
                        quests: { where: { status: 'APPROVED' } },
                        boosts: true,
                        referrals: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found in database" });
        }

        // Return the full user object including the new relations
        return res.status(200).json(user);
    } catch (error) {
        console.error("ME_API_ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}