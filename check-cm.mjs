import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCandyMachine, fetchCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { publicKey } from "@metaplex-foundation/umi";

const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
const CANDY_MACHINE_ID = "Dtz8f1hsqCKwa7TEkzzi8dXELk11y4YXaxqVqTDA1pAS";

async function check() {
  const umi = createUmi(RPC_URL).use(mplCandyMachine());
  console.log("Checking Candy Machine:", CANDY_MACHINE_ID);
  
  try {
    const cm = await fetchCandyMachine(umi, publicKey(CANDY_MACHINE_ID));
    
    console.log("-----------------------------------------");
    console.log("1. ON-CHAIN AUTHORITY:", cm.authority.toString());
    console.log("2. COLLECTION MINT:", cm.collectionMint.toString());
    console.log("3. ITEMS REDEEMED:", cm.itemsRedeemed.toString(), "/", cm.data.itemsAvailable.toString());
    
    // Check Guard Settings
    console.log("-----------------------------------------");
    console.log("4. CHECKING GUARDS...");
    // This will print the raw guard data so we can see the start date
    console.log(JSON.stringify(cm.mintAuthority, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    , 2));

  } catch (e) {
    console.error("Error fetching:", e);
  }
}

check();