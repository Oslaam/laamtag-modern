// src/pages/api/swap/quote.ts
const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6/quote";

export default async function handler(req, res) {
    const { inputMint, outputMint, amount } = req.query;
    const platformFeeBps = 50; // 0.5%

    // We add platformFeeBps to the quote request
    const url = `${JUPITER_QUOTE_API}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50&platformFeeBps=${platformFeeBps}`;

    const response = await fetch(url);
    const quote = await response.json();
    res.status(200).json(quote);
}