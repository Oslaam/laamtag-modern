use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer}; 
use anchor_spl::token::{self, Token, MintTo};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::{
    create_master_edition_v3, create_metadata_accounts_v3,
    CreateMasterEditionV3, CreateMetadataAccountsV3, 
    mpl_token_metadata::types::DataV2,
};

declare_id!("HyojGUP4kXbK42sPr9DAe1rDCnnYp4JPgzvXbG78kmUd");

#[program]
pub mod anchor {
    use super::*;

    pub fn register_domain(ctx: Context<RegisterDomain>, name: String, years: u8) -> Result<()> {
        let name_len = name.len();
        
        // 1. Calculate Price in SOL (Lamports)
        let base_price_lamports = match name_len {
            3 => 2000_000_000, // 2.0 SOL
            4 => 1000_000_000, // 1.0 SOL
            _ => 500_000_000,  // 0.5 SOL
        };

        let total_amount = (base_price_lamports as u64) * (years as u64);

        // 2. TRANSFER SOL FEE
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.treasury_wallet.to_account_info(),
            },
        );
        transfer(cpi_context, total_amount)?;

        // 3. Initialize Domain Data (Already created by Anchor via 'init')
        let domain_account = &mut ctx.accounts.domain_account;
        domain_account.owner = *ctx.accounts.user.key;
        domain_account.name = name.clone();

        // 4. MINT THE NFT BADGE
        let mint_to_accounts = MintTo {
            mint: ctx.accounts.nft_mint.to_account_info(),
            to: ctx.accounts.nft_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        token::mint_to(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), mint_to_accounts), 
            1
        )?;

        // 5. Create Metadata (Metaplex)
        let metadata_infos = CreateMetadataAccountsV3 {
            metadata: ctx.accounts.metadata.to_account_info(),
            mint: ctx.accounts.nft_mint.to_account_info(),
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
                uri: "https://app.uselaamtag.xyz/api/metadata/laam.json".to_string(),
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            true, 
            true, 
            None,
        )?;

        // 6. Create Master Edition
        let edition_infos = CreateMasterEditionV3 {
            edition: ctx.accounts.master_edition.to_account_info(),
            mint: ctx.accounts.nft_mint.to_account_info(),
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
            Some(0), 
        )?;

        msg!("Domain {}.laam registered successfully", name);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String, years: u8)]
pub struct RegisterDomain<'info> {
    #[account(
        init, 
        payer = user,
        seeds = [b"laam-domain", name.as_bytes()],
        bump, 
        space = 8 + 32 + 4 + 64 
    )]
    pub domain_account: Account<'info, DomainData>,
    
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Hardcoded Treasury Check for security
    #[account(mut, address = pubkey!("CFvNTWKRz5aXAajFQr6RVBhH93ypV1gw36Gj6DUxinyc"))]
    pub treasury_wallet: AccountInfo<'info>,

    #[account(
        init,
        payer = user,
        mint::decimals = 0,
        mint::authority = user,
        mint::freeze_authority = user,
    )]
    pub nft_mint: Account<'info, anchor_spl::token::Mint>,

    /// CHECK: Metaplex PDA
    #[account(mut)]
    pub metadata: AccountInfo<'info>,

    /// CHECK: Metaplex PDA
    #[account(mut)]
    pub master_edition: AccountInfo<'info>,

    #[account(
        init,
        payer = user,
        associated_token::mint = nft_mint,
        associated_token::authority = user,
    )]
    pub nft_token_account: Account<'info, anchor_spl::token::TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: Metaplex Program ID
    pub token_metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct DomainData {
    pub owner: Pubkey,
    pub name: String,
}