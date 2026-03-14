import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { fetchMetadata, findMetadataPda } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";

const RPC = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
const COLLECTION_MINT = publicKey("3e1pfV6fucUZScyed1sfBdFwyeVCXvXud1UkZMq1iy7L");

(async () => {
  try {
    const umi = createUmi(RPC);
    const metadataPda = findMetadataPda(umi, { mint: COLLECTION_MINT });
    const metadata = await fetchMetadata(umi, metadataPda);
    console.log(" YOUR REAL UPDATE AUTHORITY IS:", metadata.updateAuthority.toString());
  } catch (e) {
    console.error("Error fetching authority:", e);
  }
})();