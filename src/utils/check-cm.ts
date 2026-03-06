import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCandyMachine, fetchCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";

export const verifyCandyMachine = async () => {
    const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
    const umi = createUmi(RPC_URL).use(mplCandyMachine());
    const candyMachineId = umiPublicKey("7EQyVJBqdsbe6fSjg9ZLuaFsB1cppBa9QLFJE86ziKh9");

    try {
        const candyMachine = await fetchCandyMachine(umi, candyMachineId);
        return "Candy Machine is HEALTHY";
    } catch (e) {
        return "Candy Machine NOT FOUND or BROKEN";
    }
};