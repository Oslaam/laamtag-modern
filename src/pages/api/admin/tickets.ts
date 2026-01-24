import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { isWalletAdmin } from '../../../lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const adminAddress = (req.query.adminAddress || req.headers['x-admin-wallet']) as string;

    // Security check using your existing lib
    if (!isWalletAdmin(adminAddress)) {
        return res.status(403).json({ error: "Unauthorized access" });
    }

    // GET: Load all tickets for the dashboard
    if (req.method === 'GET') {
        try {
            const tickets = await prisma.supportTicket.findMany({
                orderBy: { createdAt: 'desc' }
            });
            return res.status(200).json(tickets);
        } catch (error) {
            return res.status(500).json({ error: "Failed to fetch tickets" });
        }
    }

    // PATCH: Mark ticket as Resolved
    if (req.method === 'PATCH') {
        const { ticketId, newStatus } = req.body;
        try {
            await prisma.supportTicket.update({
                where: { id: ticketId },
                data: { status: newStatus }
            });
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: "Failed to update ticket" });
        }
    }

    return res.status(405).json({ message: "Method not allowed" });
}