// prisma/mock-submission.ts
import { PrismaClient, QuestStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Creating mock submission...");

  // 1. Create a dummy user (using a random Solana-like address)
  const dummyUser = await prisma.user.upsert({
    where: { walletAddress: 'FakeWallet1111111111111111111111111111111' },
    update: {},
    create: {
      walletAddress: 'FakeWallet1111111111111111111111111111111',
      laamPoints: 0,
      rank: 'Bronze'
    }
  });

  // 2. Get the "Like & Repost" quest we just seeded
  const quest = await prisma.quest.findFirst({
    where: { title: { contains: 'Like & Repost' } }
  });

  if (!quest) {
    console.error("Quest not found! Did you run the seed command?");
    return;
  }

  // 3. Create the pending submission
  const submission = await prisma.userQuest.create({
    data: {
      userId: dummyUser.walletAddress,
      questId: quest.id,
      proofLink: 'https://x.com/dummy_user/status/123456',
      status: QuestStatus.PENDING
    }
  });

  console.log(`✅ Success! Created pending submission for: ${dummyUser.walletAddress}`);
  console.log(`Quest: ${quest.title}`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());