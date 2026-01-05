import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Importing your existing Prisma client

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // 1. Only allow POST requests (Helius sends POST)
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const events = req.body;

        // Safety check to ensure body is an array
        if (!events || !Array.isArray(events)) {
            return res.status(200).json({ message: 'No events to process' });
        }

        for (const event of events) {
            if (event.type === "NFT_MINT") {
                const buyerAddress = event.events.nft.buyer;
                const mintCount = event.events.nft.nfts.length; // How many were minted in this tx

                console.log(`🔗 Webhook: Syncing ${mintCount} mints for ${buyerAddress}`);

                // 2. DATABASE UPDATE LOGIC (Prisma)
                // We use 'upsert' to handle both existing and new users
                await prisma.user.upsert({
                    where: { walletAddress: buyerAddress },
                    // If user exists: Add the new mints to their total
                    update: { 
                        personalMinted: { increment: mintCount } 
                    },
                    // If user does NOT exist: Create them with the mint count
                    create: {
                        walletAddress: buyerAddress,
                        personalMinted: mintCount,
                        laamPoints: 0, // Default starting points
                        rank: "Seeker" // Default starting rank
                    }
                });
            }
        }

        // 3. Respond to Helius
        return res.status(200).json({ status: 'success' });
    } catch (err) {
        console.error("Webhook error:", err);
        return res.status(500).json({ error: 'Sync failed' });
    }
}