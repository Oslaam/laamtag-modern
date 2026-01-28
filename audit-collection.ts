// // // // import { PrismaClient } from '@prisma/client';
// // // // import axios from 'axios';

// // // // const prisma = new PrismaClient();
// // // // const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
// // // // const COLLECTION_ID = "Dtuj3q4a2LxqhgQa3sDeGWeRsohKk38s5XgyrkRR6FLc";

// // // // async function runAudit() {
// // // //     console.log("🔍 Fetching On-Chain Collection Data...");
// // // //     try {
// // // //         const res = await axios.post(HELIUS_RPC, {
// // // //             jsonrpc: "2.0",
// // // //             id: "audit",
// // // //             method: "getAssetsByGroup",
// // // //             params: {
// // // //                 groupKey: "collection",
// // // //                 groupValue: COLLECTION_ID,
// // // //                 page: 1,
// // // //                 limit: 1000
// // // //             }
// // // //         });

// // // //         const items = res.data.result.items;
// // // //         const dbStakes = await prisma.stakedNFT.findMany();
// // // //         const stakedMints = new Set(dbStakes.map(s => s.mintAddress));

// // // //         const report: Record<string, { minted: number, staked: number }> = {};

// // // //         items.forEach((item: any) => {
// // // //             const owner = item.ownership.owner;
// // // //             const isStaked = stakedMints.has(item.id);
// // // //             if (!report[owner]) { report[owner] = { minted: 0, staked: 0 }; }
// // // //             report[owner].minted += 1;
// // // //             if (isStaked) { report[owner].staked += 1; }
// // // //         });

// // // //         console.log("\n--- LAAMTAG COLLECTION AUDIT ---");
// // // //         console.table(Object.entries(report).map(([wallet, data]) => ({
// // // //             Wallet: wallet,
// // // //             Total_Owned: data.minted,
// // // //             Staked: data.staked,
// // // //             In_Wallet: data.minted - data.staked
// // // //         })));
// // // //     } catch (e) {
// // // //         console.error("Audit failed:", e);
// // // //     } finally {
// // // //         await prisma.$disconnect();
// // // //     }
// // // // }

// // // // runAudit();


// // // import { PrismaClient } from '@prisma/client';
// // // import axios from 'axios';

// // // const prisma = new PrismaClient();
// // // const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
// // // const COLLECTION_ID = "Dtuj3q4a2LxqhgQa3sDeGWeRsohKk38s5XgyrkRR6FLc";

// // // async function runDetailedAudit() {
// // //     console.log("🔍 Fetching full ownership list from Blockchain...");
// // //     try {
// // //         const res = await axios.post(HELIUS_RPC, {
// // //             jsonrpc: "2.0",
// // //             id: "audit",
// // //             method: "getAssetsByGroup",
// // //             params: {
// // //                 groupKey: "collection",
// // //                 groupValue: COLLECTION_ID,
// // //                 page: 1,
// // //                 limit: 1000
// // //             }
// // //         });

// // //         const items = res.data.result.items;
// // //         const dbStakes = await prisma.stakedNFT.findMany();
// // //         const stakedMints = new Set(dbStakes.map(s => s.mintAddress));

// // //         console.log(`\n--- DETAILED MINT REPORT (${items.length} Total Items) ---`);
        
// // //         // Grouping data by wallet for a cleaner view
// // //         const walletGroups: Record<string, any[]> = {};
// // //         items.forEach((item: any) => {
// // //             const owner = item.ownership.owner;
// // //             if (!walletGroups[owner]) walletGroups[owner] = [];
            
// // //             walletGroups[owner].push({
// // //                 Mint: item.id,
// // //                 Status: stakedMints.has(item.id) ? "STAKED" : "IN WALLET",
// // //                 Name: item.content?.metadata?.name || "Unknown"
// // //             });
// // //         });

// // //         // Printing a clean breakdown for each wallet
// // //         for (const [wallet, nfts] of Object.entries(walletGroups)) {
// // //             console.log(`\nWallet: ${wallet} (${nfts.length} NFTs)`);
// // //             console.table(nfts);
// // //         }

// // //     } catch (e) {
// // //         console.error("Audit failed:", e);
// // //     } finally {
// // //         await prisma.$disconnect();
// // //     }
// // // }

// // // runDetailedAudit();


// // import { PrismaClient } from '@prisma/client';
// // import axios from 'axios';

// // const prisma = new PrismaClient();
// // const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
// // const COLLECTION_ID = "Dtuj3q4a2LxqhgQa3sDeGWeRsohKk38s5XgyrkRR6FLc";

// // async function runDetailedAudit() {
// //     console.log("🔍 Fetching full ownership list from Blockchain...");
// //     try {
// //         const res = await axios.post(HELIUS_RPC, {
// //             jsonrpc: "2.0",
// //             id: "audit",
// //             method: "getAssetsByGroup",
// //             params: {
// //                 groupKey: "collection",
// //                 groupValue: COLLECTION_ID,
// //                 page: 1,
// //                 limit: 1000
// //             }
// //         });

// //         const items = res.data.result.items;
// //         const dbStakes = await prisma.stakedNFT.findMany();
// //         const stakedMints = new Set(dbStakes.map(s => s.mintAddress));

// //         // Grouping logic to count how many each wallet owns
// //         const walletSummary: Record<string, { total: number, staked: number, inWallet: number, mints: string[] }> = {};

// //         items.forEach((item: any) => {
// //             const owner = item.ownership.owner;
// //             const isStaked = stakedMints.has(item.id);

// //             if (!walletSummary[owner]) {
// //                 walletSummary[owner] = { total: 0, staked: 0, inWallet: 0, mints: [] };
// //             }

// //             walletSummary[owner].total += 1;
// //             walletSummary[owner].mints.push(item.id);
// //             if (isStaked) {
// //                 walletSummary[owner].staked += 1;
// //             } else {
// //                 walletSummary[owner].inWallet += 1;
// //             }
// //         });

// //         console.log(`\n--- LAAMTAG HOLDER REPORT (${items.length} Total Items) ---`);
        
// //         // This creates the clean table you asked for
// //         const tableData = Object.entries(walletSummary).map(([wallet, data]) => ({
// //             "Wallet Address": wallet,
// //             "Amount Minted": data.total,
// //             "Currently Staked": data.staked,
// //             "In Wallet": data.inWallet
// //         }));

// //         console.table(tableData);

// //         // Also listing specific mints for the user to verify
// //         console.log("\n--- MINT ADDRESSES BY WALLET ---");
// //         Object.entries(walletSummary).forEach(([wallet, data]) => {
// //             console.log(`\nWallet: ${wallet}`);
// //             console.log(`Mints: ${data.mints.join(', ')}`);
// //         });

// //     } catch (e) {
// //         console.error("Audit failed:", e);
// //     } finally {
// //         await prisma.$disconnect();
// //     }
// // }

// // runDetailedAudit();



// import { PrismaClient } from '@prisma/client';
// import axios from 'axios';

// const prisma = new PrismaClient();
// const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
// const COLLECTION_ID = "Dtuj3q4a2LxqhgQa3sDeGWeRsohKk38s5XgyrkRR6FLc";
// const TARGET_WALLET = "CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc";

// async function runDetailedMintAudit() {
//     console.log(`🔍 Auditing Wallet: ${TARGET_WALLET}...`);
//     try {
//         // 1. Get all assets in the collection
//         const res = await axios.post(HELIUS_RPC, {
//             jsonrpc: "2.0",
//             id: "audit",
//             method: "getAssetsByGroup",
//             params: {
//                 groupKey: "collection",
//                 groupValue: COLLECTION_ID,
//                 page: 1,
//                 limit: 1000
//             }
//         });

//         const items = res.data.result.items;
        
//         // 2. Get all stakes for THIS wallet from DB
//         const dbStakes = await prisma.stakedNFT.findMany({
//             where: { ownerAddress: TARGET_WALLET }
//         });
//         const stakedMintsInDB = new Set(dbStakes.map(s => s.mintAddress));

//         // 3. Separate the mints
//         const stakedMints: string[] = [];
//         const inWalletMints: string[] = [];

//         items.forEach((item: any) => {
//             if (item.ownership.owner === TARGET_WALLET) {
//                 if (stakedMintsInDB.has(item.id)) {
//                     stakedMints.push(item.id);
//                 } else {
//                     inWalletMints.push(item.id);
//                 }
//             }
//         });

//         console.log("\n================================================");
//         console.log(`REPORT FOR: ${TARGET_WALLET}`);
//         console.log(`Total Found: ${stakedMints.length + inWalletMints.length}`);
//         console.log("================================================");

//         console.log(`\n✅ STAKED NFTS (${stakedMints.length}):`);
//         if (stakedMints.length > 0) {
//             stakedMints.forEach((mint, i) => console.log(`  ${i + 1}. ${mint}`));
//         } else {
//             console.log("  None");
//         }

//         console.log(`\n📦 IN-WALLET NFTS (${inWalletMints.length}):`);
//         if (inWalletMints.length > 0) {
//             inWalletMints.forEach((mint, i) => console.log(`  ${i + 1}. ${mint}`));
//         } else {
//             console.log("  None");
//         }

//     } catch (e) {
//         console.error("Audit failed:", e);
//     } finally {
//         await prisma.$disconnect();
//     }
// }

// runDetailedMintAudit();


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

        // 2. Get the staking records from your database
        const dbStakes = await prisma.stakedNFT.findMany();
        
        // Map database records by Mint Address for quick lookup
        const stakeMap = new Map(dbStakes.map(s => [s.mintAddress, s.ownerAddress]));

        // 3. Build the flat list
        const report = items.map((item: any) => {
            const currentOwner = item.ownership.owner;
            const mintAddress = item.id;
            
            // The "Original Minter" is the ownerAddress stored in your DB for that NFT
            // If it's not in the DB, the current owner is the only owner we know.
            const originalOwner = stakeMap.get(mintAddress) || currentOwner;
            
            // Check if it's currently sitting in the Treasury Vault
            const isVaulted = currentOwner === TREASURY_VAULT ? "YES (In Vault)" : "NO (In User Wallet)";

            return {
                "NFT Mint Address": mintAddress,
                "Original Minter (User)": originalOwner,
                "Is in Treasury Vault?": isVaulted,
                "Current On-Chain Owner": currentOwner
            };
        });

        console.log("\n====================================================================================================");
        console.log(`                          LAAMTAG NFT-BY-NFT STATUS REPORT (${items.length} Items)`);
        console.log("====================================================================================================");

        console.table(report);

    } catch (e) {
        console.error("Audit failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

runFlatAudit();

// npx ts-node audit-collection.ts