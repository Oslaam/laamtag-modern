import { prisma } from './prisma';

/**
 * logActivity is a helper function. 
 * You call it whenever you want to "record" an event in the user's history ledger.
 */
export async function logActivity(
    wallet: string,
    type: string,
    amount: number,
    asset: 'LAAM' | 'TAG' | 'SOL' | 'USDC'
) {
    try {
        await prisma.activity.create({
            data: {
                userId: wallet, // Changed from walletAddress to userId to match your schema
                type: type,
                amount: amount,
                asset: asset,
            }
        });
        console.log(`[Ledger] Recorded ${type} for ${wallet}: ${amount} ${asset}`);
    } catch (error) {
        console.error("CRITICAL: Failed to log activity to database:", error);
    }
}