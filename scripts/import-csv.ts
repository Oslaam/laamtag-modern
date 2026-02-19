import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // Add this
import { parse } from 'csv-parse';

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function importHolders() {
    const csvFilePath = path.resolve(__dirname, 'seeker-holders-all-1771367590743.csv');
    const records: any[] = [];

    console.log("Reading CSV from:", csvFilePath);

    const parser = fs.createReadStream(csvFilePath).pipe(
        parse({
            columns: true,
            skip_empty_lines: true,
        })
    );

    for await (const record of parser) {
        const address = record.owner;
        if (address) {
            records.push({
                walletAddress: address,
                hasAccess: false, 
            });
        }
    }

    console.log(`Found ${records.length} addresses. Starting import...`);

    // Using createMany with skipDuplicates is the most efficient way
    const result = await prisma.user.createMany({
        data: records,
        skipDuplicates: true,
    });

    console.log(`Import finished! Added ${result.count} new users.`);
}

importHolders()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());