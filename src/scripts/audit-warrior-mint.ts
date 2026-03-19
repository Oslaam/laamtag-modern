import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
const WARRIOR_COLLECTION = "5LoQty88d9q9GhBcwVLYZPjaPNKMmBkK765PWah5msgJ";

// Fetch the original minter by getting the first transaction of the NFT mint address
// The first tx is always the mint — the fee payer is the original minter
async function getOriginalMinter(mintAddress: string): Promise<string> {
    try {
        const res = await axios.post(HELIUS_RPC, {
            jsonrpc: "2.0",
            id: "get-sigs",
            method: "getSignaturesForAddress",
            params: [
                mintAddress,
                { limit: 1, before: undefined, until: undefined, commitment: "confirmed" }
            ]
        });

        const signatures = res.data.result;
        if (!signatures || signatures.length === 0) return "Not Found";

        // Get the oldest signature (last in array when sorted desc — or use `before` param)
        // Actually getSignaturesForAddress returns newest first by default
        // So we need the LAST signature = the original mint tx
        // Use `limit: 1000` and take last, OR use a smarter approach:
        // The mint tx is always the one that created the account — it's the oldest
        // We'll get all sigs and take the last one
        const allSigsRes = await axios.post(HELIUS_RPC, {
            jsonrpc: "2.0",
            id: "get-all-sigs",
            method: "getSignaturesForAddress",
            params: [
                mintAddress,
                { limit: 1000, commitment: "confirmed" }
            ]
        });

        const allSigs = allSigsRes.data.result;
        if (!allSigs || allSigs.length === 0) return "Not Found";

        // Oldest tx = last in the array (desc order)
        const oldestSig = allSigs[allSigs.length - 1].signature;

        // Fetch the actual transaction to get the fee payer (original minter)
        const txRes = await axios.post(HELIUS_RPC, {
            jsonrpc: "2.0",
            id: "get-tx",
            method: "getTransaction",
            params: [
                oldestSig,
                { commitment: "confirmed", maxSupportedTransactionVersion: 0 }
            ]
        });

        const tx = txRes.data.result;
        if (!tx) return "Not Found";

        // The fee payer is always accountKeys[0] — this is who signed and paid for the mint
        const accountKeys = tx.transaction?.message?.accountKeys;
        if (!accountKeys || accountKeys.length === 0) return "Not Found";

        return accountKeys[0]; // fee payer = original minter

    } catch (e: any) {
        return "Error";
    }
}

async function auditWarriorMints() {
    console.log("🔍 Generating Warrior NFT Mint Report...\n");
    console.log("⏳ This may take a moment — fetching original minter for each NFT...\n");

    try {
        // 1. Get every Warrior NFT in the collection on-chain
        const res = await axios.post(HELIUS_RPC, {
            jsonrpc: "2.0",
            id: "warrior-audit",
            method: "getAssetsByGroup",
            params: {
                groupKey: "collection",
                groupValue: WARRIOR_COLLECTION,
                page: 1,
                limit: 1000
            }
        });

        const items = res.data.result?.items || [];
        console.log(`🖼️  Found ${items.length} Warrior NFTs in collection.\n`);

        // 2. Get all deployed warriors from DB
        const deployedWarriors = await prisma.deployedWarrior.findMany();
        const deployedMap = new Map(
            deployedWarriors.map(d => [d.mintAddress, {
                status: d.status,
                location: d.location,
            }])
        );

        // 3. Get all MINT activity records from DB
        const mintActivities = await prisma.activity.findMany({
            where: { type: "MINT" },
            select: {
                userId: true,
                amount: true,
                createdAt: true,
            }
        });
        const mintWallets = new Set(mintActivities.map(a => a.userId));

        // 4. Build report — fetch original minter per NFT
        const report: any[] = [];

        for (const item of items) {
            const mintAddress = item.id;
            const currentOwner = item.ownership?.owner || "Unknown";
            const nftName = item.content?.metadata?.name || "Neural Warrior";

            // Get the original minter from on-chain tx history
            const originalMinter = await getOriginalMinter(mintAddress);

            // Deployed status
            const deployed = deployedMap.get(mintAddress);
            const deployStatus = deployed
                ? `${deployed.status}${deployed.location ? ` (${deployed.location})` : ''}`
                : "NOT DEPLOYED";

            // Mint mode — check DB activity for this minter
            const activity = mintActivities.find(a => a.userId === originalMinter);
            const mintMode = !activity
                ? "Unknown"
                : activity.amount === 300
                    ? "WARRIOR (300 SKR)"
                    : "PUBLIC (1000 SKR)";

            // Is this minter in our DB?
            const inDatabase = mintWallets.has(originalMinter) ? "✅ YES" : "❌ NO";

            report.push({
                "Original Minter": originalMinter,
                "NFT Mint Address": mintAddress,
                "NFT Name": nftName,
                "Current On-Chain Owner": currentOwner,
                "Deployed Status": deployStatus,
                "Mint Mode": mintMode,
                "In DB": inDatabase,
            });

            console.log(`✅ ${nftName} | Minter: ${originalMinter.slice(0, 12)}... | Owner: ${currentOwner.slice(0, 12)}...`);

            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 400));
        }

        // 5. Sort by Original Minter
        report.sort((a, b) => {
            const ownerA = a["Original Minter"].toLowerCase();
            const ownerB = b["Original Minter"].toLowerCase();
            if (ownerA < ownerB) return -1;
            if (ownerA > ownerB) return 1;
            return 0;
        });

        console.log("\n====================================================================================================");
        console.log(`              WARRIOR NFT MINT REPORT (${items.length} NFTs)`);
        console.log("              (Sorted by Original Minter)");
        console.log("====================================================================================================");

        console.table(report);

        // 6. Summary
        const deployed = report.filter(r => r["Deployed Status"] !== "NOT DEPLOYED").length;
        const notDeployed = report.filter(r => r["Deployed Status"] === "NOT DEPLOYED").length;
        const warrior = report.filter(r => r["Mint Mode"].includes("300")).length;
        const publicMint = report.filter(r => r["Mint Mode"].includes("1000")).length;
        const notInDb = report.filter(r => r["In DB"] === "❌ NO").length;

        console.log("\n====================================================================================================");
        console.log("                                     SUMMARY");
        console.log("====================================================================================================");
        console.log(`🖼️  Total Warriors minted:       ${items.length}`);
        console.log(`⚔️  Currently deployed:          ${deployed}`);
        console.log(`🏠 Not deployed (in wallet):    ${notDeployed}`);
        console.log(`🛡️  Warrior mints (300 SKR):     ${warrior}`);
        console.log(`🌐 Public mints (1000 SKR):     ${publicMint}`);
        console.log(`⚠️  Minters not in DB:           ${notInDb}`);
        console.log("====================================================================================================\n");

    } catch (e) {
        console.error("Audit failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

auditWarriorMints();

//                                        cd "C:\Users\User\Desktop\The Scaffold\laamtag-modern"


// npx ts-node src/scripts/audit-mints.ts