import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

    const { walletAddress, amount } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { walletAddress } });

        if (!user || user.tagTickets < amount) {
            return res.status(400).json({ success: false, message: "Insufficient TAG" });
        }

        await prisma.user.update({
            where: { walletAddress },
            data: { tagTickets: { decrement: amount } }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Deduction failed" });
    }
}