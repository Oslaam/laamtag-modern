import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { QuestStatus } from '@prisma/client';
import prisma from '../../lib/prisma';

const connection = new Connection("https://api.mainnet-beta.solana.com");
const REWARD_AMOUNT = 1000;
const QUEST_ID = "nft-mint-claim";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: "Address required" });
    const completion = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId: String(address), questId: QUEST_ID } }
    });
    return res.status(200).json({ 
      hasClaimed: !!completion,
      status: completion?.status || "NOT_STARTED"
    });
  }

  if (req.method !== 'POST') return res.status(405).end();
  const { walletAddress } = req.body;

  try {
    const alreadyClaimed = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId: walletAddress, questId: QUEST_ID } }
    });
    if (alreadyClaimed) return res.status(400).json({ message: "Already claimed bonus." });

    const owner = new PublicKey(walletAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    });
    const ownedMints = tokenAccounts.value
      .filter(a => a.account.data.parsed.info.tokenAmount.uiAmount === 1)
      .map(a => a.account.data.parsed.info.mint);

    if (ownedMints.length === 0) return res.status(400).json({ message: "No NFTs found." });

    const usedMints = await prisma.claimedNFT.findMany({
      where: { mintAddress: { in: ownedMints } }
    });
    const usedMintList = usedMints.map(c => c.mintAddress);
    const validMints = ownedMints.filter(m => !usedMintList.includes(m));

    if (validMints.length === 0) return res.status(400).json({ message: "NFTs already used." });

    const targetMint = validMints[0];

    await prisma.$transaction([
      prisma.claimedNFT.create({
        data: { mintAddress: targetMint, claimedBy: walletAddress }
      }),
      prisma.user.update({
        where: { walletAddress },
        data: { laamPoints: { increment: REWARD_AMOUNT } }
      }),
      prisma.userQuest.create({
        data: { 
          userId: walletAddress, 
          questId: QUEST_ID, 
          status: QuestStatus.APPROVED 
        }
      })
    ]);

    return res.status(200).json({ success: true, message: "1,000 LAAM Added!" });
  } catch (error) {
    return res.status(500).json({ error: "Verification failed." });
  }
}