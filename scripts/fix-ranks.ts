import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAllRanks() {
    // One single SQL query updates ALL users at once — no loop, no 110k calls
    await prisma.$executeRaw`
        UPDATE "User"
        SET rank = CASE
            WHEN "laamPoints" >= 50000000 THEN 'Ascendant'
            WHEN "laamPoints" >= 20000000 THEN 'Eternal'
            WHEN "laamPoints" >= 10000000 THEN 'Mythic'
            WHEN "laamPoints" >= 5000000  THEN 'Legend'
            WHEN "laamPoints" >= 2000000  THEN 'Diamond'
            WHEN "laamPoints" >= 1000000  THEN 'Platinum'
            WHEN "laamPoints" >= 500000   THEN 'Gold Elite'
            WHEN "laamPoints" >= 200000   THEN 'Gold'
            WHEN "laamPoints" >= 100000   THEN 'Silver Elite'
            WHEN "laamPoints" >= 50000    THEN 'Silver'
            WHEN "laamPoints" >= 20000    THEN 'Bronze Elite'
            ELSE 'Bronze'
        END
        WHERE "laamPoints" > 0
    `;

    console.log('✅ All ranks fixed in one query.');
    await prisma.$disconnect();
}

fixAllRanks();