import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity, generateSigner, percentAmount, some } from "@metaplex-foundation/umi";
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import fs from "fs";

const RPC = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";

(async () => {
  try {
    const umi = createUmi(RPC).use(mplTokenMetadata());
    const secret = JSON.parse(fs.readFileSync("authority.json", "utf8"));
    const adminKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
    umi.use(keypairIdentity(adminKeypair));

    const collectionMint = generateSigner(umi);
    console.log("🚀 Creating the Fresh Parent Collection NFT...");

    await createNft(umi, {
      mint: collectionMint,
      name: "LAAMTAG Genesis Collection",
      symbol: "LAAM",
      uri: "https://gateway.irys.xyz/fqUaBd0rD7CsufZ29zF16fY3ypLpvMVxKEJswk3Jtew",
      sellerFeeBasisPoints: percentAmount(5),
      isCollection: true,
      // We removed tokenStandard to fix the TypeScript error in your screenshot
      collectionDetails: some({ __kind: "V1", size: BigInt(5000) }),
    }).sendAndConfirm(umi);

    console.log("✅ NEW COLLECTION MINT ADDRESS:");
    console.log(collectionMint.publicKey.toString());
  } catch (e) {
    console.error("❌ Error:", e);
  }
})();