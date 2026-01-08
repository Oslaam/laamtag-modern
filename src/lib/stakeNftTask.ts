import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { transferV1, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey } from '@metaplex-foundation/umi';

const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=a2488320-5767-4074-8bfe-8eda86de12f3";
const VAULT_RECEIVER = publicKey("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc");

export const stakeNftOnChain = async (wallet: any, mintAddress: string) => {
    const umi = createUmi(HELIUS_RPC).use(walletAdapterIdentity(wallet));

    try {
        const tx = await transferV1(umi, {
            mint: publicKey(mintAddress),
            authority: umi.identity,
            tokenOwner: publicKey(wallet.publicKey.toString()),
            destinationOwner: VAULT_RECEIVER,
            tokenStandard: TokenStandard.NonFungible,
        }).sendAndConfirm(umi);

        return { success: true, signature: tx.signature };
    } catch (error) {
        console.error("On-chain staking failed", error);
        return { success: false, error };
    }
};