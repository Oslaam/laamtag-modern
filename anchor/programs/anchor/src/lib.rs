use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::program::invoke;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use anchor_spl::metadata::{
    create_master_edition_v3, create_metadata_accounts_v3,
    CreateMasterEditionV3, CreateMetadataAccountsV3, Metadata,
    mpl_token_metadata::types::DataV2,
};

declare_id!("HyojGUP4kXbK42sPr9DAe1rDCnnYp4JPgzvXbG78kmUd");

#[program]
pub mod anchor {
    use super::*;

    pub fn register_domain(ctx: Context<RegisterDomain>, name: String, years: u8) -> Result<()> {
        let name_len = name.len();
        
        // 1. Calculate Price
        let base_price_usd = match name_len {
            3 => 100,
            4 => 50,
            _ => 20,
        };
        let sol_price_lamports = (base_price_usd * (years as u64) * 1_000_000_000) / 100;

        // 2. Transfer Fee to Treasury
        invoke(
            &system_instruction::transfer(&ctx.accounts.user.key(), &ctx.accounts.treasury.key(), sol_price_lamports),
            &[ctx.accounts.user.to_account_info(), ctx.accounts.treasury.to_account_info(), ctx.accounts.system_program.to_account_info()],
        )?;

        // 3. Initialize Domain Data PDA
        let domain_account = &mut ctx.accounts.domain_account;
        domain_account.owner = *ctx.accounts.user.key;
        domain_account.name = name.clone();

        // 4. MINT THE NFT (The "Badge" for Seed Vault)
        // a. Mint 1 token to the user
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        token::mint_to(CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts), 1)?;

        // b. Create Metadata (This makes it searchable by name)
        let metadata_infos = CreateMetadataAccountsV3 {
            metadata: ctx.accounts.metadata.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            mint_authority: ctx.accounts.user.to_account_info(),
            payer: ctx.accounts.user.to_account_info(),
            update_authority: ctx.accounts.user.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };

        create_metadata_accounts_v3(
            CpiContext::new(ctx.accounts.token_metadata_program.to_account_info(), metadata_infos),
            DataV2 {
                name: format!("{}.laam", name),
                symbol: "LAAM".to_string(),
                uri: "https://app.uselaamtag.xyz/api/metadata/laam.json".to_string(), // Put your logo here
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            true, // is_mutable
            true, // update_authority_is_signer
            None, // collection_details
        )?;

        // c. Create Master Edition (This makes it a unique NFT)
        let edition_infos = CreateMasterEditionV3 {
            edition: ctx.accounts.master_edition.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            update_authority: ctx.accounts.user.to_account_info(),
            mint_authority: ctx.accounts.user.to_account_info(),
            payer: ctx.accounts.user.to_account_info(),
            metadata: ctx.accounts.metadata.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };

        create_master_edition_v3(
            CpiContext::new(ctx.accounts.token_metadata_program.to_account_info(), edition_infos),
            Some(0), // Max supply 0 means unique NFT
        )?;

        msg!("Domain {}.laam registered and NFT minted!", name);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String, years: u8)]
pub struct RegisterDomain<'info> {
    #[account(
        init, payer = user,
        seeds = [b"laam-domain", name.as_bytes()],
        bump, space = 8 + 32 + 4 + 64 
    )]
    pub domain_account: Account<'info, DomainData>,
    
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, address = pubkey!("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc"))]
    pub treasury: AccountInfo<'info>,

    // NFT Accounts
    #[account(mut)]
    pub mint: Signer<'info>,
    /// CHECK: Created by Metaplex
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    /// CHECK: Created by Metaplex
    #[account(mut)]
    pub master_edition: AccountInfo<'info>,
    /// CHECK: The user's token account for this NFT
    #[account(mut)]
    pub token_account: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    /// CHECK: Metaplex program ID
    pub token_metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct DomainData {
    pub owner: Pubkey,
    pub name: String,
}