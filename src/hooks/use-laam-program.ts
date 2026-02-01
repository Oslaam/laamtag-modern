import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Buffer } from 'buffer';
// import idl from '../../anchor/target/idl/anchor.json';

// Standard Metaplex Metadata Program ID
const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export const useLaamProgram = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const programId = new PublicKey("DrFGrmnaBZnWEny2FZeVGftqTyrgRDHie8ktcpQzd13F");
    const treasuryPubKey = new PublicKey("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc");

    const getProgram = () => {
        if (!wallet.publicKey || !wallet.signTransaction) return null;
        const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
        // return new Program(idl as any, provider);
    };

    /**
     * Calculates the SOL price based on name length and registration years.
     */
    const getPrice = (nameLength: number, selectedYears: number) => {
        let basePriceUSD = 20;
        if (nameLength === 3) basePriceUSD = 100;
        if (nameLength === 4) basePriceUSD = 50;

        // Mock SOL price at $100 for this calculation
        const solPriceUSD = 100;
        return (basePriceUSD / solPriceUSD) * selectedYears;
    };

    /**
     * Finds the owner of a domain name.
     */
    const resolveName = async (name: string) => {
        const program = getProgram();
        if (!program) return null;

        const [domainAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("laam-domain"), Buffer.from(name)],
            programId
        );

        try {
            // Using 'domainData' as the account name defined in your Rust struct
            const account = await (program.account as any).domainData.fetch(domainAddress);
            return account.owner as PublicKey;
        } catch (err) {
            console.log("Domain not found on-chain");
            return null;
        }
    };

    /**
     * Registers a domain and mints a corresponding Metaplex NFT.
     */
    const registerName = async (name: string, registrationYears: number) => {
        if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected!");
        const program = getProgram();
        if (!program) throw new Error("Program not initialized!");

        // 1. Generate a unique Mint for the NFT
        const mintKeypair = Keypair.generate();

        // 2. Derive our custom Domain PDA
        const [domainAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("laam-domain"), Buffer.from(name)],
            programId
        );

        // 3. Derive Metaplex Metadata PDA: ["metadata", metadata_program_id, mint_id]
        const [metadataAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
            METADATA_PROGRAM_ID
        );

        // 4. Derive Metaplex Master Edition PDA: ["metadata", metadata_program_id, mint_id, "edition"]
        const [masterEditionAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer(), Buffer.from("edition")],
            METADATA_PROGRAM_ID
        );

        // 5. Derive the user's Associated Token Account (ATA) for this mint
        const tokenAccount = getAssociatedTokenAddressSync(
            mintKeypair.publicKey,
            wallet.publicKey
        );

        try {
            const tx = await program.methods
                .registerDomain(name, registrationYears)
                .accounts({
                    domainAccount: domainAddress,
                    user: wallet.publicKey,
                    treasury: treasuryPubKey,
                    mint: mintKeypair.publicKey,
                    metadata: metadataAddress,
                    masterEdition: masterEditionAddress,
                    tokenAccount: tokenAccount,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    tokenMetadataProgram: METADATA_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .signers([mintKeypair]) // Required because we are creating the mint account
                .rpc();

            return tx;
        } catch (err) {
            console.error("Registration & Minting failed:", err);
            throw err;
        }
    };

    // Return all three to fix the "red line" errors in your components
    return { registerName, getPrice, resolveName };
};