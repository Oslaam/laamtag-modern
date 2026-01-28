import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { isWalletAdmin } from '../../../lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const adminAddress = (req.headers['x-admin-wallet'] as string) || (req.query.adminAddress as string);

    // Security check
    if (!isWalletAdmin(adminAddress)) {
        return res.status(403).json({ error: "Unauthorized access" });
    }

    // 1. GET: Fetch all tickets for the Admin Dashboard
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

    // 2. PATCH: Update status from 'Pending' to 'Resolved'
    if (req.method === 'PATCH') {
        const { ticketId, newStatus } = req.body;
        try {
            const updated = await prisma.supportTicket.update({
                where: { id: ticketId },
                data: { status: newStatus }
            });
            return res.status(200).json(updated);
        } catch (error) {
            return res.status(500).json({ error: "Failed to update ticket" });
        }
    }

    return res.status(405).json({ message: "Method not allowed" });
}