import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
const COLLECTION_ID = "Dtuj3q4a2LxqhgQa3sDeGWeRsohKk38s5XgyrkRR6FLc";
const TREASURY_VAULT = "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc";

async function runFlatAudit() {
    console.log("🔍 Generating Individual NFT Report...");
    try {
        // 1. Get every NFT in the collection
        const res = await axios.post(HELIUS_RPC, {
            jsonrpc: "2.0",
            id: "audit",
            method: "getAssetsByGroup",
            params: {
                groupKey: "collection",
                groupValue: COLLECTION_ID,
                page: 1,
                limit: 1000
            }
        });

        const items = res.data.result.items;
        const dbStakes = await prisma.stakedNFT.findMany();
        const stakeMap = new Map(dbStakes.map(s => [s.mintAddress, s.ownerAddress]));

        // 3. Build the flat list
        let report = items.map((item: any) => {
            const currentOwner = item.ownership.owner;
            const mintAddress = item.id;
            const originalOwner = stakeMap.get(mintAddress) || currentOwner;
            const isVaulted = currentOwner === TREASURY_VAULT ? "YES (In Vault)" : "NO (In User Wallet)";

            return {
                "Original Minter (User)": originalOwner, // Moved to first column for better visibility
                "NFT Mint Address": mintAddress,
                "Is in Treasury Vault?": isVaulted,
                "Current On-Chain Owner": currentOwner
            };
        });

        // --- NEW: SORTING LOGIC ---
        // This sorts the report by the "Original Minter (User)" string
        report.sort((a, b) => {
            const ownerA = a["Original Minter (User)"].toLowerCase();
            const ownerB = b["Original Minter (User)"].toLowerCase();
            if (ownerA < ownerB) return -1;
            if (ownerA > ownerB) return 1;
            return 0;
        });
        // --------------------------

        console.log("\n====================================================================================================");
        console.log(`                LAAMTAG NFT-BY-NFT STATUS REPORT (${items.length} Items)`);
        console.log("                (Sorted by Original Minter)");
        console.log("====================================================================================================");

        console.table(report);

    } catch (e) {
        console.error("Audit failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

runFlatAudit();
// npx ts-node src/scripts/audit-collection.ts

//  cd "C:\Users\User\Desktop\The Scaffold\laamtag-modern"