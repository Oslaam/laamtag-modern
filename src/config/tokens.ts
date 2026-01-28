// src/config/tokens.ts

export interface Token {
    symbol: string;
    name: string;
    mint: string;
    decimals: number;
    logo: string;
}

export const SUPPORTED_TOKENS: Token[] = [
    {
        symbol: 'SOL',
        name: 'Solana',
        mint: 'So11111111111111111111111111111111111111112',
        decimals: 9,
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
    },
    {
        symbol: 'USDC',
        name: 'USD Coin',
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
    },
    {
        symbol: 'USDT',
        name: 'Tether',
        mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        decimals: 6,
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png'
    },
    {
        symbol: 'JUP',
        name: 'Jupiter',
        mint: 'JUPyiwrYJFv1mHSS4HZyyYvpbwwPECdvDs8RPe7Br9M',
        decimals: 6,
        logo: 'https://static.jup.ag/jup/icon.png'
    },
    {
        symbol: 'SKR',
        name: 'Seeker',
        mint: 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3', // Replace with your Seeker Mint
        decimals: 9,
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
    },
];