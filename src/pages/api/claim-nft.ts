import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import prisma from '../../lib/prisma';

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com");
const LAAM_CREATOR_ADDRESS = "DhMECuyiL61unsDLhGTrqxKLrUoTPtEd9SXamr9Xbeoz";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { walletAddress, questId } = req.body;
  if (!walletAddress) return res.status(400).json({ error: "Missing wallet address" });

  try {
    const owner = new PublicKey(walletAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    });

    const ownedMints = tokenAccounts.value
      .filter(a => a.account.data.parsed.info.tokenAmount.uiAmount > 0)
      .map(a => a.account.data.parsed.info.mint);

    if (ownedMints.length === 0) {
      return res.status(400).json({ message: "No NFTs found." });
    }

    const validLaamMints: string[] = [];
    for (const mint of ownedMints.slice(0, 10)) {
      const metadataPDA = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(), new PublicKey(mint).toBuffer()],
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
      )[0];
      const accountInfo = await connection.getAccountInfo(metadataPDA);
      if (accountInfo && accountInfo.data.toString().includes(LAAM_CREATOR_ADDRESS)) {
        validLaamMints.push(mint);
      }
    }

    if (validLaamMints.length === 0) return res.status(400).json({ message: "No LAAMTAG NFTs detected." });

    const alreadyClaimed = await prisma.claimedNFT.findMany({
      where: { mintAddress: { in: validLaamMints } }
    });
    const claimedMintList = alreadyClaimed.map(c => c.mintAddress);
    const unclaimedMints = validLaamMints.filter(m => !claimedMintList.includes(m));

    if (unclaimedMints.length === 0) return res.status(400).json({ message: "All NFTs already claimed." });

    const totalReward = unclaimedMints.length * 1000;

    await prisma.$transaction([
      ...unclaimedMints.map(mint => prisma.claimedNFT.create({
        data: { mintAddress: mint, claimedBy: walletAddress }
      })),
      prisma.userQuest.upsert({
        where: { userId_questId: { userId: walletAddress, questId: questId } },
        update: { status: 'COMPLETED' },
        create: { userId: walletAddress, questId, status: 'COMPLETED' },
      }),
      prisma.user.update({
        where: { walletAddress },
        data: { laamPoints: { increment: totalReward } }
      })
    ]);

    return res.status(200).json({ success: true, message: `Verified! +${totalReward} LAAM added.` });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Blockchain busy. Try again." });
  }
}