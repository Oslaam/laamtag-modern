import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { transferV1, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey } from '@metaplex-foundation/umi';
import axios from 'axios';

export const unstakeNftOnChain = async (wallet: any, mintAddress: string) => {
    // 1. Initialize Umi (Using your Helius RPC)
    const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=YOUR_KEY')
        .use(walletAdapterIdentity(wallet));

    const nftMint = publicKey(mintAddress);
    const userOwner = publicKey(wallet.publicKey.toString());
    const programId = publicKey("YOUR_STAKING_PROGRAM_ID");

    // 2. Find your Vault PDA (Must match the seeds used in staking)
    const [vaultPda] = umi.eddsa.findPda(programId, [
        Buffer.from('vault'),
        userOwner,
        nftMint
    ]);

    try {
        // 3. On-chain Transfer (Vault -> User)
        const tx = await transferV1(umi, {
            mint: nftMint,
            authority: umi.identity,
            tokenOwner: vaultPda,     // NFT comes FROM the vault
            destinationOwner: userOwner, // NFT goes TO the user
            tokenStandard: TokenStandard.NonFungible,
        }).sendAndConfirm(umi);

        // 4. Update the Database
        await axios.post('/api/staking/unstake', {
            walletAddress: wallet.publicKey.toString(),
            mintAddress: mintAddress
        });

        return { success: true, signature: tx.signature };
    } catch (error) {
        console.error("On-chain unstaking failed", error);
        throw error;
    }
};