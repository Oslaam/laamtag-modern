import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { transferV1, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey } from '@metaplex-foundation/umi';

export const stakeNftOnChain = async (wallet: any, mintAddress: string) => {
    // 1. Initialize Umi
    const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY')
        .use(walletAdapterIdentity(wallet));

    const nftMint = publicKey(mintAddress);
    const userOwner = publicKey(wallet.publicKey.toString());

    // Replace "staking_program" with your actual program alias or direct public key
    const programId = publicKey("YOUR_STAKING_PROGRAM_ID");

    // 2. Define your Vault PDA using findPda from eddsa
    // 2. Define your Vault PDA
    const [vaultPda] = umi.eddsa.findPda(programId, [
        Buffer.from('vault'),
        userOwner, //
        nftMint    // 
    ]);

    try {
        // 3. Build and send the Transfer Instruction
        const tx = await transferV1(umi, {
            mint: nftMint,
            authority: umi.identity,
            tokenOwner: userOwner,
            destinationOwner: vaultPda,
            tokenStandard: TokenStandard.NonFungible,
            amount: 1,
        }).sendAndConfirm(umi);

        return { success: true, signature: tx.signature };
    } catch (error) {
        console.error("On-chain staking failed", error);
        return { success: false, error };
    }
};