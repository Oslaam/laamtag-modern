const { Keypair } = require('@solana/web3.js');
const bip39 = require('bip39');
const fs = require('fs');

// 1. PASTE YOUR 12 WORDS HERE
const seedPhrase = "maid bounce gauge misery gate bicycle cup employ story cycle reason trip"; 

async function convert() {
    // 2. Convert words to a seed buffer
    const seed = await bip39.mnemonicToSeed(seedPhrase);
    
    // 3. Create the Keypair (using the 0/0 path standard)
    const keypair = Keypair.fromSeed(seed.slice(0, 32));
    
    // 4. Save to your authority file format
    const keyArray = Array.from(keypair.secretKey);
    fs.writeFileSync('scripts/authority.json', JSON.stringify(keyArray));
    
    console.log("Conversion Complete!");
    console.log("Public Address:", keypair.publicKey.toBase58());
    console.log("Check if this matches your Admin Wallet!");
}

convert();