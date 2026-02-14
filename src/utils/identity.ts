import { TldParser } from "@onsol/tldparser";
import { Connection, PublicKey } from "@solana/web3.js";

export async function resolveUserIdentity(
    connection: Connection,
    address: string,
    prismaUsername?: string | null
) {
    if (!address) return "UNKNOWN";

    // 1. If we already have a .laam name in our Prisma DB, use it immediately
    if (prismaUsername) {
        return prismaUsername.includes('.laam') ? prismaUsername : `${prismaUsername}.laam`;
    }

    const parser = new TldParser(connection);
    const owner = new PublicKey(address);

    try {
        // 2. Check Blockchain for .laam (Native Priority)
        const laamDomains = await parser.getParsedAllUserDomainsFromTld(owner, "laam");
        if (laamDomains.length > 0) return `${laamDomains[0].domain}.laam`;

        // 3. Check Blockchain for .skr (Seeker Priority)
        const skrDomains = await parser.getParsedAllUserDomainsFromTld(owner, "skr");
        if (skrDomains.length > 0) return `${skrDomains[0].domain}.skr`;

        // 4. Final Fallback: Short Wallet
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    } catch (e) {
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }
}