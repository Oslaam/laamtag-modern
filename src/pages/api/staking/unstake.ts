import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();
    const { walletAddress, mintAddress } = req.body;

    try {
        // Secure Check: Does this user actually own the stake record?
        const stake = await prisma.stakedNFT.findFirst({
            where: { mintAddress, ownerAddress: walletAddress }
        });

        if (!stake) return res.status(404).json({ message: "Stake record not found." });

        // Remove from database to "Unlock" it
        await prisma.stakedNFT.delete({ where: { mintAddress } });

        return res.status(200).json({ success: true, message: "NFT Unlocked and returned." });
    } catch (error) {
        return res.status(500).json({ message: "Unstaking failed." });
    }
}