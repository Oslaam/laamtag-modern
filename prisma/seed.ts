// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting seed...");

  // 1. Define your Quests
  // TIP: Ensure every quest has a unique 'id' string so upsert can find it easily.
  const quests = [
    {
      id: "welcome-basic",
      title: "Welcome to LAAM",
      reward: 100,
      type: "basic"
    },
    {
      id: "nft-mint-claim", // This ID is critical for your code logic
      title: "The Minting Quest",
      reward: 1000,
      type: "nft"
    },
    {
      id: "daily-checkin",
      title: "Daily Check-in",
      reward: 10,
      type: "daily"
    },
    {
      id: "early-bird-alpha",
      title: "Early Bird Alpha (Limited)",
      reward: 500,
      type: "special",
      limit: 10
    },
    {
      id: "social-x-repost",
      title: "Like & Repost latest X",
      reward: 50,
      type: "social"
    },
    // --- ADD YOUR NEW QUESTS HERE ---
    {
      id: "follow-laamtag",
      title: "Follow @LAAMTAG on X",
      reward: 200,
      type: "social"
    }
  ];

  console.log("🌱 Syncing quests (Upserting)...");

  for (const q of quests) {
    await prisma.quest.upsert({
      where: { id: q.id }, // Look for this ID
      update: {            // If found, update the fields
        title: q.title,
        reward: q.reward,
        type: q.type,
        limit: q.limit ?? null
      },
      create: q,           // If NOT found, create the new quest
    });
  }

  console.log("✅ Database synced successfully without deleting user progress!");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });