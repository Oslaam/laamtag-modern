// src/pages/api/user/swapActivity/save.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const { wallet, type, asset, amount, signature } = req.body;

        await prisma.user.upsert({
            where: { walletAddress: wallet },
            update: {},
            create: { walletAddress: wallet },
        });

        const activity = await prisma.activity.create({
            data: {
                userId: wallet,
                type: type,
                asset: asset,
                amount: amount,
                signature: signature
            },
        });

        return res.status(200).json({ success: true, activity });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
    }
}