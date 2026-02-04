import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Adjust path if your lib is elsewhere

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // 1. Get the wallet address from the URL (e.g., /api/user/me?address=TOKEN...)
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
        return res.status(400).json({ message: "Address is required" });
    }

    try {
        // 2. Look up the user in your database
        const user = await prisma.user.findUnique({
            where: { walletAddress: address },
            include: {
                activities: true, // This allows the 'nonce' check to work
            }
        });

        if (!user) {
            // If user isn't in DB yet, create them or return error
            return res.status(404).json({ message: "User not found in database" });
        }

        // 3. Send the user data (including hasPaidDiceEntry) back to the frontend
        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
}