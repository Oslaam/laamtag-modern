import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { code, walletAddress } = req.body;

    // The secret code they type
    const MASTER_CODE = "LAAM-2026-TAG";
    // The walletAddress/ID of your dummy system user
    const ROOT_REFERRER_ID = "LAAMTAG_ROOT";

    try {
        const normalizedCode = code?.trim().toUpperCase();

        // 1. Fetch user status
        const existingUser = await prisma.user.findUnique({
            where: { walletAddress: walletAddress || 'GATE_CHECK' }
        });

        const isExistingUser = !!existingUser;
        let isValid = false;
        let referrerAddress = null;

        // 2. Logic: Check for Admin/Root Code first (Allows Existing & New Users)
        if (normalizedCode === MASTER_CODE) {
            isValid = true;
            referrerAddress = ROOT_REFERRER_ID;
        }
        // 3. Logic: Check for Standard User Referral Codes
        else {
            const recruiter = await prisma.user.findUnique({
                where: { referralCode: normalizedCode }
            });
            if (recruiter) {
                isValid = true;
                referrerAddress = recruiter.walletAddress;
            }
        }

        if (isValid) {
            if (walletAddress && walletAddress !== 'GATE_CHECK') {
                // Perform the update or create
                await prisma.user.upsert({
                    where: { walletAddress: walletAddress },
                    update: {
                        hasAccess: true,
                        // Update referrer if they used the Master Code, 
                        // or if they don't have a referrer yet.
                        referredBy: (normalizedCode === MASTER_CODE || !existingUser?.referredBy)
                            ? referrerAddress
                            : existingUser.referredBy
                    },
                    create: {
                        walletAddress: walletAddress,
                        hasAccess: true,
                        referredBy: referrerAddress,
                        isAdmin: normalizedCode === MASTER_CODE, // Grant admin if they used master code
                    }
                });
            }
            return res.status(200).json({ success: true });
        }

        // 4. Handle Errors
        return res.status(400).json({
            success: false,
            message: "INVALID ACCESS CODE"
        });

    } catch (error) {
        console.error("Access Validation Error:", error);
        return res.status(500).json({ success: false, message: "DATABASE_ERROR" });
    }
}