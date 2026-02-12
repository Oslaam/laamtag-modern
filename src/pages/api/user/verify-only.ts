import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

// The specific SGT Mint Address you are looking for
const SGT_MINT_ADDRESS = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
        return res.status(400).json({ hasAccess: false, error: "Missing address" });
    }

    try {
        // Use a reliable RPC endpoint (Helius, Alchemy, or Mainnet-beta)
        const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com");
        const ownerPublicKey = new PublicKey(address);

        // Fetch all Token-2022 accounts owned by this wallet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            ownerPublicKey,
            { programId: TOKEN_2022_PROGRAM_ID }
        );

        // Check if any of the accounts hold the SGT Mint and have a balance > 0
        const hasSgt = tokenAccounts.value.some((account) => {
            const parsedInfo = account.account.data.parsed.info;
            return parsedInfo.mint === SGT_MINT_ADDRESS && parsedInfo.tokenAmount.uiAmount > 0;
        });

        return res.status(200).json({ hasAccess: hasSgt });

    } catch (error) {
        console.error("SGT Verification Error:", error);
        // Default to false on error to keep the gate secure
        return res.status(500).json({ hasAccess: false });
    }
}