import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const connection = new Connection("https://api.mainnet-beta.solana.com");

// Replace with your verified Creator Address or Collection ID
const COLLECTION_CREATOR = "YOUR_CREATOR_WALLET_ADDRESS"; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { walletAddress } = req.body;

  try {
    // 1. Get all assets owned by the wallet
    // Note: In a real production environment, you'd use a DAS API (like Helius) 
    // to check collection membership. For now, we'll check token accounts.
    const owner = new PublicKey(walletAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    });

    const ownedMints = tokenAccounts.value
      .filter(a => a.account.data.parsed.info.tokenAmount.uiAmount === 1)
      .map(a => a.account.data.parsed.info.mint);

    // 2. Filter out mints that have ALREADY been claimed
    const alreadyClaimed = await prisma.claimedNFT.findMany({
      where: { mintAddress: { in: ownedMints } }
    });
    
    const claimedMintList = alreadyClaimed.map(c => c.mintAddress);
    const validMints = ownedMints.filter(m => !claimedMintList.includes(m));

    if (validMints.length === 0) {
      return res.status(400).json({ message: "No unclaimed LaamTag NFTs found." });
    }

    // 3. Limit to max 3 per user requirement (optional logic)
    const mintsToClaim = validMints.slice(0, 3);
    const totalReward = mintsToClaim.length * 1000;

    // 4. Atomic Update: Record the specific NFTs as claimed and give points
    await prisma.$transaction([
      ...mintsToClaim.map(mint => prisma.claimedNFT.create({
        data: { mintAddress: mint, claimedBy: walletAddress }
      })),
      prisma.user.update({
        where: { walletAddress },
        data: { laamPoints: { increment: totalReward } }
      })
    ]);

    return res.status(200).json({ 
      success: true, 
      message: `Successfully claimed ${totalReward} LAAM for ${mintsToClaim.length} NFTs!` 
    });
  } catch (e) {
    return res.status(500).json({ error: "Blockchain verification failed." });
  }
}