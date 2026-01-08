import axios from 'axios';

export const unstakeNftOnChain = async (wallet: any, mintAddress: string) => {
    try {
        // We trigger the API which uses the Treasury Private Key to send the NFT back
        const response = await axios.post('/api/staking/unstake', {
            walletAddress: wallet.publicKey.toString(),
            mintAddress: mintAddress
        });

        return { success: true, signature: response.data.signature };
    } catch (error: any) {
        console.error("Unstaking failed", error);
        throw new Error(error.response?.data?.message || "Unstaking failed");
    }
};