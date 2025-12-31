// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting seed...");

  // 1. Cleanup: Delete in order of dependency
  console.log("Cleaning old data...");
  await prisma.userQuest.deleteMany({});
  await prisma.quest.deleteMany({});
  await prisma.claimedNFT.deleteMany({});
  // We usually don't delete Users in production, but for a fresh reset seed, it's fine:
  // await prisma.user.deleteMany({}); 

  // 2. Define your Quests
  const quests = [
    {
      title: "Welcome to LAAM",
      reward: 100,
      type: "basic"
    },
    {
      id: "nft-mint-claim", // Static ID for your NFT quest logic
      title: "The Minting Quest",
      reward: 1000,
      type: "nft"
    },
    {
      title: "Daily Check-in",
      reward: 10,
      type: "daily"
    },
    {
      title: "Early Bird Alpha (Limited)",
      reward: 500,
      type: "special",
      limit: 10 
    },
    {
      title: "Like & Repost latest X",
      reward: 50,
      type: "social"
    }
  ];

  console.log("Seeding new quests...");
  for (const q of quests) {
    await prisma.quest.create({ data: q });
  }

  console.log("✅ Database seeded successfully with LAAM Quests!");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });