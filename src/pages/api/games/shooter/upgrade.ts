import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { logActivity } from '../../../../lib/activityLogger';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection(
    "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3",
    'confirmed'
);

const BASE_COST = 1;
const MULTIPLIER = 1.2;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { walletAddress, item } = req.body;

    // UNIVERSAL MAP: Connects UI, Code, and Database names to Prisma fields
    const fieldMap: Record<string, string> = {
        // Weapon / Gun
        "weapon": "weaponLevel",
        "gun": "weaponLevel",
        "weaponlevel": "weaponLevel",
        
        // Shield
        "shield": "shieldLevel",
        "shieldlevel": "shieldLevel",
        
        // Engine / Speed / Shoe
        "engine": "shoeLevel",
        "shoe": "shoeLevel",
        "speed": "shoeLevel",
        "shoelevel": "shoeLevel",
        "enginelevel": "shoeLevel",
        
        // Hull / Life / Health
        "hull": "lifeLevel",
        "life": "lifeLevel",
        "health": "lifeLevel",
        "lifelevel": "lifeLevel",
        "hulllevel": "lifeLevel"
    };

    // Normalize to lowercase to find the match in our map
    const dbFieldName = fieldMap[item?.toLowerCase()];

    if (!dbFieldName) {
        console.error(`Unmapped item string received: "${item}"`);
        return res.status(400).json({ error: `INVALID ITEM: ${item}` });
    }

    try {
        const pubKey = new PublicKey(walletAddress);
        const accountInfo = await connection.getAccountInfo(pubKey);
        
        if (!accountInfo) {
            return res.status(404).json({ error: "Wallet not initialized on Solana" });
        }

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { walletAddress } });
            if (!user) throw new Error("USER_NOT_FOUND");

            // Use the mapped dbFieldName to find the current level
            const currentLvl = (user as any)[dbFieldName] || 0;
            const actualCost = Math.floor(BASE_COST * Math.pow(MULTIPLIER, currentLvl));

            if (user.tagTickets < actualCost) {
                throw new Error("INSUFFICIENT_FUNDS");
            }

            // Perform the update
            const updatedUser = await tx.user.update({
                where: { walletAddress },
                data: {
                    tagTickets: { decrement: actualCost },
                    [dbFieldName]: { increment: 1 }
                }
            });

            await logActivity(walletAddress, 'PURCHASE', -actualCost, 'TAG');
            return { newLevel: (updatedUser as any)[dbFieldName], cost: actualCost };
        });

        return res.status(200).json({ success: true, ...result });

    } catch (error: any) {
        console.error("Upgrade API Error:", error);
        const msg = error.message === "INSUFFICIENT_FUNDS" ? "Not enough TAG" : "Purchase Failed";
        return res.status(403).json({ error: msg });
    }
}