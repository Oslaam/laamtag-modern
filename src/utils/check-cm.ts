import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCandyMachine, fetchCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";

export const verifyCandyMachine = async () => {
    const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    const umi = createUmi(RPC_URL).use(mplCandyMachine());
    const candyMachineId = umiPublicKey("7EQyVJBqdsbe6fSjg9ZLuaFsB1cppBa9QLFJE86ziKh9");

    try {
        const candyMachine = await fetchCandyMachine(umi, candyMachineId);
        console.log("--- CANDY MACHINE CHECKUP ---");
        console.log("Items Available:", candyMachine.itemsRedeemed.toString(), "/", candyMachine.data.itemsAvailable.toString());
        console.log("Mint Authority:", candyMachine.mintAuthority.toString());
        console.log("Collection Mint:", candyMachine.collectionMint.toString());

        // If this logs successfully, the machine is healthy on-chain.
        return "Candy Machine is HEALTHY";
    } catch (e) {
        console.error("CANDY MACHINE ERROR:", e);
        return "Candy Machine NOT FOUND or BROKEN";
    }
};