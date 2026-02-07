import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

    // 1. CLIENT ONLY SENDS WHO THEY ARE (AND AUTH TOKEN IN REAL APP)
    const { walletAddress, level } = req.body;

    try {
        // 2. SERVER CALCULATES RNG (Not the client!)
        const rand = Math.random() * 100;
        let asset = "LAAM";
        let amount = (Math.random() * 10 + 5); // Keep as number for math

        if (rand > 98) { asset = "SOL"; amount = 0.001; } // Rare!
        else if (rand > 85) { asset = "TAG"; amount = 1.0; }
        else if (rand > 60) { asset = "SKR"; amount = Math.random() * 5; }

        // 3. DATABASE UPDATES (Same as before, but using server variables)
        await prisma.user.update({
            where: { walletAddress },
            data: { thuggerLevel: level }
        });

        if (asset === "LAAM" || asset === "TAG") {
            await prisma.user.update({
                where: { walletAddress },
                data: {
                    laamPoints: asset === "LAAM" ? { increment: amount } : undefined,
                    tagTickets: asset === "TAG" ? { increment: amount } : undefined,
                }
            });
        } else {
            // ... Handle Pending Rewards ...
        }

        // 4. RETURN THE RESULT TO THE CLIENT (So they can show the popup)
        return res.status(200).json({ success: true, reward: { asset, amount: amount.toFixed(2) } });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Reward failed" });
    }
}