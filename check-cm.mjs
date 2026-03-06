import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCandyMachine, fetchCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { publicKey } from "@metaplex-foundation/umi";

const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
const CANDY_MACHINE_ID = "7EQyVJBqdsbe6fSjg9ZLuaFsB1cppBa9QLFJE86ziKh9";

async function check() {
  const umi = createUmi(RPC_URL).use(mplCandyMachine());
  console.log("Checking Candy Machine:", CANDY_MACHINE_ID);

  try {
    const cm = await fetchCandyMachine(umi, publicKey(CANDY_MACHINE_ID));

    // This will print the raw guard data so we can see the start date
    console.log(JSON.stringify(cm.mintAuthority, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
      , 2));

  } catch (e) {
  }
}

check();