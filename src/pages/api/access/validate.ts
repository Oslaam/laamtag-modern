import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

const SGT_MINT_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';
const MASTER_CODE = "LAAM-2026-TAG";
const ROOT_REFERRER_ID = "LAAMTAG_ROOT";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { code, walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ success: false, message: "MISSING_WALLET" });

    try {
        const normalizedCode = code?.trim().toUpperCase();

        // --- STEP 1: VERIFY SGT OWNERSHIP (SERVER-SIDE) ---
        // Even if they have the code, we check the blockchain here to be sure.
        const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com");
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            new PublicKey(walletAddress),
            { programId: TOKEN_2022_PROGRAM_ID }
        );

        const hasSgt = tokenAccounts.value.some((account) => {
            const parsedInfo = account.account.data.parsed.info;
            return parsedInfo.mint === SGT_MINT_ADDRESS && parsedInfo.tokenAmount.uiAmount > 0;
        });

        if (!hasSgt) {
            return res.status(403).json({
                success: false,
                message: "ACCESS DENIED: NO SGT DETECTED IN WALLET"
            });
        }

        // --- STEP 2: VALIDATE THE CODE ---
        let isValid = false;
        let referrerAddress = null;

        if (normalizedCode === MASTER_CODE) {
            isValid = true;
            referrerAddress = ROOT_REFERRER_ID;
        } else {
            const recruiter = await prisma.user.findUnique({
                where: { referralCode: normalizedCode }
            });
            if (recruiter) {
                isValid = true;
                referrerAddress = recruiter.walletAddress;
            }
        }

        if (!isValid) {
            return res.status(400).json({ success: false, message: "INVALID ACCESS CODE" });
        }

        // --- STEP 3: GRANT PERMANENT ACCESS ---
        const existingUser = await prisma.user.findUnique({ where: { walletAddress } });

        await prisma.user.upsert({
            where: { walletAddress: walletAddress },
            update: {
                hasAccess: true,
                referredBy: (!existingUser?.referredBy) ? referrerAddress : existingUser.referredBy
            },
            create: {
                walletAddress: walletAddress,
                hasAccess: true,
                referredBy: referrerAddress,
                isAdmin: normalizedCode === MASTER_CODE,
            }
        });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("Access Validation Error:", error);
        return res.status(500).json({ success: false, message: "SYSTEM_ERROR" });
    }
}