export const IDL = {
    "address": "HyojGUP4kXbK42sPr9DAe1rDCnnYp4JPgzvXbG78kmUd",
    "metadata": {
        "name": "anchor",
        "version": "0.1.0",
        "spec": "0.1.0",
        "description": "Created with Anchor"
    },
    "instructions": [
        {
            "name": "register_domain",
            "discriminator": [236, 7, 208, 151, 173, 149, 73, 104],
            "accounts": [
                { "name": "domain_account", "writable": true },
                { "name": "user", "writable": true, "signer": true },
                { "name": "treasury_wallet", "writable": true },
                { "name": "nft_mint", "writable": true, "signer": true },
                { "name": "metadata", "writable": true },
                { "name": "master_edition", "writable": true },
                { "name": "nft_token_account", "writable": true },
                { "name": "token_program", "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
                { "name": "associated_token_program", "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" },
                { "name": "token_metadata_program" },
                { "name": "system_program", "address": "11111111111111111111111111111111" },
                { "name": "rent", "address": "SysvarRent111111111111111111111111111111111" }
            ],
            "args": [
                { "name": "name", "type": "string" },
                { "name": "years", "type": "u8" }
            ]
        }
    ],
    "accounts": [
        { "name": "DomainData", "discriminator": [32, 168, 189, 144, 175, 158, 228, 142] }
    ],
    "types": [
        {
            "name": "DomainData",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "owner", "type": "pubkey" },
                    { "name": "name", "type": "string" }
                ]
            }
        }
    ]
};