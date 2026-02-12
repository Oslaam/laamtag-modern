import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import crypto from 'crypto';

/**
 * Generates a cryptographically signed referral code.
 * Format: LAAM-[6_CHAR_HASH]-TAG
 * Uses a server-side secret to ensure codes cannot be spoofed.
 */
function generateValidatedCode(wallet: string): string {
    const secret = process.env.REFERRAL_SECRET || 'default_secret_change_me';

    // Create a HMAC hash using the wallet address and server secret
    const hash = crypto
        .createHmac('sha256', secret)
        .update(wallet)
        .digest('hex')
        .substring(0, 6) // Take first 6 chars for the middle segment
        .toUpperCase();

    return `LAAM-${hash}-TAG`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Only allow GET requests to fetch or generate the code safely
    if (req.method !== 'GET') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { walletAddress } = req.query;

    if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ error: "Wallet address is required" });
    }

    try {
        // 1. Fetch the user's current referral state
        const user = await prisma.user.findUnique({
            where: { walletAddress },
            select: { referralCode: true }
        });

        if (!user) {
            return res.status(404).json({ error: "User profile not found in database." });
        }

        // 2. IMMUTABILITY CHECK: If a code already exists, return it immediately.
        // This prevents "hacking" or re-generating a new code to replace an old one.
        if (user.referralCode) {
            return res.status(200).json({ referralCode: user.referralCode });
        }

        // 3. GENERATION: Only if referralCode is null, generate a new secure one
        const secureCode = generateValidatedCode(walletAddress);

        // 4. DATABASE UPDATE: Save the generated code to the user's record
        const updatedUser = await prisma.user.update({
            where: { walletAddress },
            data: { referralCode: secureCode },
            select: { referralCode: true }
        });

        return res.status(200).json({
            success: true,
            referralCode: updatedUser.referralCode
        });

    } catch (error) {
        console.error("Secure Referral Generation Error:", error);
        return res.status(500).json({ error: "Internal server error during code generation." });
    }
}