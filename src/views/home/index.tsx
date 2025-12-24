import { FC, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// Metaplex Umi Imports
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner, percentAmount } from '@metaplex-foundation/umi';

export const HomeView: FC = ({ }) => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [isMinting, setIsMinting] = useState(false);

    // --- PASTE THE LOGIC HERE ---
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_ENDPOINT || connection.rpcEndpoint;

    const umi = createUmi(rpcUrl)
        .use(mplTokenMetadata())
        .use(walletAdapterIdentity(wallet));
    // ----------------------------

    const handleMint = async () => {
        if (!wallet.publicKey) {
            alert("Please connect your wallet first!");
            return;
        }

        setIsMinting(true);
        try {
            const mint = generateSigner(umi);

            // 1. Build and Send
            const result = await createNft(umi, {
                mint,
                name: "LaamTag Seeker Genesis",
                symbol: "LTSG",
                uri: "https://arweave.net/27n4gq6THBMLHzJWZDRBDyAHD7ot5DQBdZJgFinE8Rdq",
                sellerFeeBasisPoints: percentAmount(5),
            }).sendAndConfirm(umi);

            // 2. Success Feedback
            alert(`Success! NFT Minted: ${mint.publicKey.toString()}`);
            console.log("View Transaction:", `https://explorer.solana.com/address/${mint.publicKey.toString()}?cluster=mainnet-beta`);

        } catch (error) {
            // ... error handling
        }
    };

    return (
        <div className="flex flex-col items-center p-4">
            {/* Header */}
            <div className="flex justify-between w-full max-w-2xl mb-12 items-center">
                <h1 className="text-2xl font-extrabold text-white">LAAMTAG</h1>
                <WalletMultiButton />
            </div>

            {/* Minting Card */}
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center">
                <img
                    src="https://arweave.net/7ntGd7LE3HtNFmzDymUVGqMbXeBVx2kL7LgV99xNB9C8"
                    alt="NFT Preview"
                    className="rounded-2xl mb-6 shadow-lg"
                />
                <h2 className="text-3xl font-bold text-white mb-2">LaamTag Pass</h2>
                <p className="text-gray-400 mb-6">Exclusive Perk For Limited Seeker Users</p>

                <button
                    onClick={handleMint}
                    disabled={!wallet.publicKey || isMinting}
                    className={`w-full py-4 rounded-xl font-bold transition-all ${isMinting ? 'bg-gray-700' : 'bg-gradient-to-r from-purple-500 to-green-400 hover:scale-105 text-black'
                        }`}
                >
                    {isMinting ? "Checking Seed Vault..." : "CLAIM NOW"}
                </button>
            </div>
        </div>
    );
};