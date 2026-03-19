import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

async function exportActiveWallets() {
    const outputDir = path.resolve(__dirname, '../exports');
    const outputFilePath = path.join(outputDir, 'active-laam-wallets.txt');

    // Create the exports folder if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    console.log("Querying database for users with laamPoints > 0...");

    try {
        // Fetch only the walletAddress of users where laamPoints is greater than 0
        const users = await prisma.user.findMany({
            where: {
                laamPoints: {
                    gt: 0
                }
            },
            select: {
                walletAddress: true
            }
        });

        if (users.length === 0) {
            console.log("No users found with laamPoints > 0.");
            return;
        }

        // Map the result to an array of strings
        const walletList = users.map(u => u.walletAddress);
        
        // Join with commas
        const commaSeparatedList = walletList.join(',');

        // Write to file
        fs.writeFileSync(outputFilePath, commaSeparatedList, 'utf8');

        console.log(`---`);
        console.log(`Success! Found ${users.length} active users.`);
        console.log(`File saved to: ${outputFilePath}`);
        console.log(`---`);

    } catch (error) {
        console.error("Database Query Error:", error);
    }
}

exportActiveWallets()
    .catch((e) => console.error("Export Error:", e))
    .finally(async () => await prisma.$disconnect());



//        npx tsx scripts/export-wallets-list.ts