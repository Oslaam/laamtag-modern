import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { adminWallet, targetWallet, amount } = req.body;

    const admin = await prisma.user.findUnique({ where: { walletAddress: adminWallet } });
    if (!admin?.isAdmin) return res.status(401).json({ error: "Unauthorized" });

    await prisma.user.update({
        where: { walletAddress: targetWallet },
        data: { tagTickets: { increment: parseInt(amount) } }
    });

    return res.status(200).json({ success: true });
}