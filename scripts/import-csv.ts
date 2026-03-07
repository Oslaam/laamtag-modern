import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

async function importWallets() {
    const csvFilePath = path.resolve(__dirname, '../seeker.csv');
    const records: any[] = [];

    // 1. Ensure the Root user exists first
    await prisma.user.upsert({
        where: { walletAddress: 'LAAMTAG_ROOT' },
        update: {},
        create: { walletAddress: 'LAAMTAG_ROOT', hasAccess: true },
    });

    console.log("Reading wallets from:", csvFilePath);

    const parser = fs.createReadStream(csvFilePath).pipe(
        parse({
            columns: true,
            skip_empty_lines: true,
            trim: true,
        })
    );

    for await (const record of parser) {
        // This looks for 'address' or 'owner' or 'Wallet' in your CSV columns
        const address = record.address || record.owner || record.Wallet || record.wallet;

        if (address) {
            records.push({
                walletAddress: address.trim(),
                hasAccess: true,
                referredBy: 'LAAMTAG_ROOT',
            });
        }
    }

    if (records.length === 0) {
        console.log("No addresses found. Check your CSV column headers!");
        return;
    }

    console.log(`Found ${records.length} wallets. Importing...`);

    // 2. Add them all at once. If they already exist, skip them.
    const result = await prisma.user.createMany({
        data: records,
        skipDuplicates: true,
    });

    console.log(`Success! Added ${result.count} new wallets to the database.`);
}

importWallets()
    .catch((e) => console.error("Error:", e))
    .finally(async () => await prisma.$disconnect());

    // npx tsx scripts/import-csv.ts