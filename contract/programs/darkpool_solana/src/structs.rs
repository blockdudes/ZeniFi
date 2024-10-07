use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = owner, space = 8 + 32 + 32 + 4 + 32 * 10)]
    pub leverage_account: Account<'info, LeverageAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TokenList<'info> {
    #[account(mut, has_one = owner)]
    pub leverage_account: Account<'info, LeverageAccount>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub leverage_account: Account<'info, LeverageAccount>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + std::mem::size_of::<UserBalance>(),
        seeds = [b"user_balance", user.key().as_ref()],
        bump
    )]
    pub user_balance: Account<'info, UserBalance>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositERC20<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub leverage_account: Account<'info, LeverageAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + std::mem::size_of::<UserBalance>(),
        seeds = [b"user_balance", user.key().as_ref()],
        bump
    )]
    pub user_balance: Account<'info, UserBalance>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Borrow<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_balance: Account<'info, UserBalance>,
    pub leverage_account: Account<'info, LeverageAccount>,

    // For ERC20 tokens
    pub token_program: Option<Program<'info, Token>>,
    #[account(mut)]
    pub token_mint: Option<Account<'info, Mint>>,
    #[account(mut)]
    pub vault_token_account: Option<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub user_token_account: Option<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Repay<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_balance: Account<'info, UserBalance>,
    pub leverage_account: Account<'info, LeverageAccount>,

    // For ERC20 tokens
    pub token_program: Option<Program<'info, Token>>,
    #[account(mut)]
    pub token_mint: Option<Account<'info, Mint>>,
    #[account(mut)]
    pub vault_token_account: Option<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub user_token_account: Option<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Burn<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_balance: Account<'info, UserBalance>,
    pub leverage_account: Account<'info, LeverageAccount>,

    // For ERC20 tokens
    pub token_program: Option<Program<'info, Token>>,
    #[account(mut)]
    pub token_mint: Option<Account<'info, Mint>>,
    #[account(mut)]
    pub vault_token_account: Option<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub user_token_account: Option<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_balance: Account<'info, UserBalance>,
    #[account(mut)]
    pub leverage_account: Account<'info, LeverageAccount>,

    // For ERC20 tokens
    pub token_program: Option<Program<'info, Token>>,
    #[account(mut)]
    pub token_mint: Option<Account<'info, Mint>>,
    #[account(mut)]
    pub vault_token_account: Option<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub user_token_account: Option<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OrderExecute<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_in: Account<'info, Mint>,
    pub token_out: Account<'info, Mint>,
    #[account(mut)]
    pub user_balance: Account<'info, UserBalance>,
    #[account(mut)]
    pub user_order_state: Account<'info, UserOrderState>,
    #[account(mut)]
    pub leverage_account: Account<'info, LeverageAccount>,
    pub token_program: Program<'info, Token>,
    #[account(mut)]
    pub vault_token_in_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_out_account: Account<'info, TokenAccount>,
}

#[account]
pub struct UserOrderState {
    pub user: Pubkey,
    pub orders: Vec<OrderState>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct OrderState {
    pub order_id: String,
    pub sell_token: Pubkey,
    pub buy_token: Pubkey,
    pub sell_token_amount: u64,
    pub buy_token_amount: u64,
    pub timestamp: i64,
    pub status: OrderStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum OrderStatus {
    Pending,
    Fulfilled,
    Cancelled,
}

#[account]
pub struct LeverageAccount {
    pub owner: Pubkey,
    pub native_mint: Pubkey,
    pub listed_tokens: Vec<Pubkey>,
}

#[account]
pub struct UserBalance {
    pub native_balance: TokenBalance,
    pub fungible_balance: TokenBalance,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct TokenBalance {
    pub token_mint: Pubkey,
    pub deposit_token_balance: u64,
    pub leverage_token_balance: u64,
    pub borrow_token_balance: u64,
    pub user_token_balance: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct UserBalanceInfo {
    pub native_balance: TokenBalance,
    pub fungible_balance: TokenBalance,
}

#[derive(Accounts)]
pub struct GetUserBalance<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"user_balance", user.key().as_ref()],
        bump,
    )]
    pub user_balance: Account<'info, UserBalance>,
}

#[derive(Accounts)]
pub struct GetUserOrderState<'info> {
    pub user: Signer<'info>,
    #[account(
        constraint = user_order_state.user == user.key(),
    )]
    pub user_order_state: Account<'info, UserOrderState>,
}
