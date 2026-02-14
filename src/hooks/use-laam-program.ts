import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair, SYSVAR_RENT_PUBKEY, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Buffer } from 'buffer';
// @ts-ignore
import idl from './idl/anchor.json';

const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export const useLaamProgram = () => {
    const { connection } = useConnection();
    const wallet = useWallet();

    const programId = new PublicKey("HyojGUP4kXbK42sPr9DAe1rDCnnYp4JPgzvXbG78kmUd");
    const treasuryPubKey = new PublicKey("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc");

    const getProgram = () => {
        if (!wallet.publicKey || !wallet.signTransaction) return null;
        const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
        return new Program(idl as any, provider);
    };

    const getPrice = (nameLength: number, selectedYears: number) => {
        let basePriceSOL = 0.5;
        if (nameLength === 3) basePriceSOL = 2.0;
        else if (nameLength === 4) basePriceSOL = 1.0;
        return basePriceSOL * selectedYears;
    };

    const resolveName = async (name: string) => {
        const program = getProgram();
        if (!program) return null;
        const [domainAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("laam-domain"), Buffer.from(name.toLowerCase().trim())],
            programId
        );
        try {
            const account = await (program.account as any).domainData.fetch(domainAddress);
            return account.owner as PublicKey;
        } catch (err) {
            return null;
        }
    };

    const registerName = async (name: string, registrationYears: number) => {
        const program = getProgram();
        if (!program || !wallet.publicKey) throw new Error("Wallet not connected!");

        const mintKeypair = Keypair.generate();
        const tx = new Transaction();

        const [userSkrAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("seeker"), wallet.publicKey.toBuffer()],
            programId
        );

        const [domainAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("laam-domain"), Buffer.from(name.toLowerCase().trim())],
            programId
        );

        const [metadataAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
            METADATA_PROGRAM_ID
        );

        const [masterEditionAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer(), Buffer.from("edition")],
            METADATA_PROGRAM_ID
        );

        const nftTokenAccount = getAssociatedTokenAddressSync(mintKeypair.publicKey, wallet.publicKey);

        // --- THE LOCK FIX: AUTO-INITIALIZE PROFILE IF MISSING ---
        const skrInfo = await connection.getAccountInfo(userSkrAddress);
        if (!skrInfo) {
            const initIx = await program.methods
                .initialize()
                .accounts({
                    userSkrAccount: userSkrAddress,
                    user: wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();
            tx.add(initIx);
        }

        // Add the registration instruction
        const regIx = await program.methods
            .registerDomain(name, registrationYears)
            .accounts({
                domainAccount: domainAddress,
                user: wallet.publicKey,
                userSkrAccount: userSkrAddress,
                treasuryWallet: treasuryPubKey,
                nftMint: mintKeypair.publicKey,
                metadata: metadataAddress,
                masterEdition: masterEditionAddress,
                nftTokenAccount: nftTokenAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                tokenMetadataProgram: METADATA_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .instruction();

        tx.add(regIx);

        return await program.provider.sendAndConfirm!(tx, [mintKeypair]);
    };

    return { registerName, getPrice, resolveName };
};