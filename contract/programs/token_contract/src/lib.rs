use anchor_lang::prelude::*;
use anchor_spl::token::{
    self, Approve, InitializeMint, Mint, MintTo, Token, TokenAccount, Transfer,
};

declare_id!("6HEsfvvUtEDgpu3214E4Chf9boYX28WJ8spbpvsvZDZJ");

#[program]
pub mod token_contract {

    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        name: String,
        symbol: String,
        decimals: u8,
    ) -> Result<()> {
        if ctx.accounts.mint_info.name.is_empty() && ctx.accounts.mint_info.symbol.is_empty() {
            let mint_info = &mut ctx.accounts.mint_info;
            mint_info.name = name;
            mint_info.symbol = symbol;
            mint_info.decimals = decimals;
        }
        if ctx.accounts.mint.data_is_empty() {
            let cpi_accounts = InitializeMint {
                mint: ctx.accounts.mint.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            token::initialize_mint(
                CpiContext::new(cpi_program, cpi_accounts),
                decimals,
                &Pubkey::default(),
                None,
            )?;
        }
        Ok(())
    }

    pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        let cpi_accounts = token::MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn approve(ctx: Context<ApproveSpender>, amount: u64) -> Result<()> {
        let cpi_accounts = Approve {
            to: ctx.accounts.token_account.to_account_info(),
            delegate: ctx.accounts.spender.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::approve(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn transfer_from(ctx: Context<TransferFrom>, amount: u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.delegate.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn transfer(ctx: Context<TransferTokens>, amount: u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }
}

#[account]
pub struct MintInfo {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init_if_needed, payer = user, space = 8 + 32 + 32 + 1)]
    pub mint_info: Account<'info, MintInfo>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: This is safe because we are initializing the mint if needed
    #[account(mut)]
    pub mint: AccountInfo<'info>, // Mint account can be reused if it exists
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    /// CHECK: This is safe because we're using it as a mint in the CPI call
    #[account(mut)]
    pub mint: AccountInfo<'info>,
    /// CHECK: This is safe because we're using it as a token account in the CPI call
    #[account(mut)]
    pub token_account: AccountInfo<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ApproveSpender<'info> {
    /// CHECK: This is safe because we're using it as a token account in the CPI call
    #[account(mut)]
    pub token_account: AccountInfo<'info>,
    /// CHECK: This is safe because we're only using it as the account being approved to spend
    pub spender: AccountInfo<'info>,
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct TransferFrom<'info> {
    /// CHECK: This is safe because we're using it as a token account in the CPI call
    #[account(mut)]
    pub from: AccountInfo<'info>,
    /// CHECK: This is safe because we're using it as a token account in the CPI call
    #[account(mut)]
    pub to: AccountInfo<'info>,
    pub delegate: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct TransferTokens<'info> {
    /// CHECK: This is safe because we're using it as a token account in the CPI call
    #[account(mut)]
    pub from: AccountInfo<'info>,
    /// CHECK: This is safe because we're using it as a token account in the CPI call
    #[account(mut)]
    pub to: AccountInfo<'info>,
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
