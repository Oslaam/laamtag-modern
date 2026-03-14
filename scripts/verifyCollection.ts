import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity, publicKey } from "@metaplex-foundation/umi";
import { 
  verifyCollectionV1, 
  fetchMetadataFromSeeds,
  mplTokenMetadata
} from "@metaplex-foundation/mpl-token-metadata";
import fs from "fs";

const RPC = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";

(async () => {
  try {
    const umi = createUmi(RPC).use(mplTokenMetadata());
    const secret = JSON.parse(fs.readFileSync("authority.json", "utf8"));
    const adminKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
    umi.use(keypairIdentity(adminKeypair));

    // THE NEW ADDRESS WE JUST CREATED
    const collectionMint = publicKey("2jcTeXJwmmVoEHDQYhxPSjGj66UkXx8oN9QvnpKoEPN2");
    
    console.log("Fetching Metadata for:", collectionMint.toString());
    const metadata = await fetchMetadataFromSeeds(umi, { mint: collectionMint });

    console.log("Verifying on-chain...");

    await verifyCollectionV1(umi, {
      metadata: metadata.publicKey,
      collectionMint: collectionMint,
      authority: umi.identity,
    }).sendAndConfirm(umi);

    console.log("SUCCESS: Collection verified!");
  } catch (e: any) {
    console.error("Verification failed:", e);
    if (e.logs) console.log("Logs:", e.logs);
  }
})();