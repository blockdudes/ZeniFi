#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use anchor_spl::token::{self, Transfer};

mod error;
mod events;
mod structs;

use error::ErrorCode;
use events::*;
use structs::*;

declare_id!("5FPrCjrhxkfm8dR79gPrCfYVYuJ7iUdpdZLLUMtZUwXR");

#[program]
pub mod darkpool_solana {
    use super::*;

    pub const WSOL_MINT: Pubkey = pubkey!("So11111111111111111111111111111111111111112");

    pub fn initialize(ctx: Context<Initialize>, token_mint: Pubkey) -> Result<()> {
        let leverage_account = &mut ctx.accounts.leverage_account;
        leverage_account.owner = ctx.accounts.owner.key();
        leverage_account.native_mint = WSOL_MINT;
        leverage_account.listed_tokens.push(token_mint);
        Ok(())
    }

    pub fn get_user_balance(ctx: Context<GetUserBalance>) -> Result<UserBalanceInfo> {
        let user_balance = &ctx.accounts.user_balance;

        Ok(UserBalanceInfo {
            native_balance: user_balance.native_balance.clone(),
            fungible_balance: user_balance.fungible_balance.clone(),
        })
    }

    pub fn get_user_order_state(ctx: Context<GetUserOrderState>) -> Result<Vec<OrderState>> {
        let user_order_state = &ctx.accounts.user_order_state;
        Ok(user_order_state.orders.clone())
    }

    pub fn token_list(ctx: Context<TokenList>, token_mint: Pubkey) -> Result<()> {
        require!(
            ctx.accounts.owner.key() == ctx.accounts.leverage_account.owner,
            ErrorCode::OnlyOwner
        );
        ctx.accounts.leverage_account.listed_tokens.push(token_mint);
        emit!(TokenListUpdate {
            owner: ctx.accounts.owner.key(),
            listed_token: token_mint
        });
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        msg!("Deposit function called");
        msg!("User balance account: {:?}");

        // let amount = ctx.accounts.user.lamports() - Rent::get()?.minimum_balance(0);
        require!(amount > 0, ErrorCode::ValueShouldBeGreaterThanZero);

        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.leverage_account.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.leverage_account.to_account_info(),
            ],
        )?;

        let user_balance = &mut ctx.accounts.user_balance;
        if user_balance.native_balance.token_mint == Pubkey::default() {
            user_balance.native_balance.token_mint = WSOL_MINT;
        }

        require!(
            user_balance.native_balance.token_mint == WSOL_MINT,
            ErrorCode::InvalidToken
        );

        user_balance.native_balance.deposit_token_balance += amount;
        user_balance.native_balance.leverage_token_balance += amount * 10;

        emit!(TokenDeposit {
            depositor: ctx.accounts.user.key(),
            token: WSOL_MINT,
            deposit_token_balance: user_balance.native_balance.deposit_token_balance,
            leverage_token_balance: user_balance.native_balance.leverage_token_balance,
            is_native: true,
        });

        Ok(())
    }

    pub fn deposit_erc20(ctx: Context<DepositERC20>, amount: u64) -> Result<()> {
        require!(
            ctx.accounts
                .leverage_account
                .listed_tokens
                .contains(&ctx.accounts.token_mint.key()),
            ErrorCode::TokenNotListed
        );

        let transfer_instruction = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                transfer_instruction,
            ),
            amount,
        )?;

        let user_balance = &mut ctx.accounts.user_balance;

        if user_balance.fungible_balance.token_mint == Pubkey::default() {
            user_balance.fungible_balance.token_mint = ctx.accounts.token_mint.key();
        }

        require!(
            user_balance.fungible_balance.token_mint == ctx.accounts.token_mint.key(),
            ErrorCode::InvalidToken
        );

        user_balance.fungible_balance.deposit_token_balance += amount;
        user_balance.fungible_balance.leverage_token_balance += amount * 10;

        emit!(TokenDeposit {
            depositor: ctx.accounts.user.key(),
            token: ctx.accounts.token_mint.key(),
            deposit_token_balance: user_balance.fungible_balance.deposit_token_balance,
            leverage_token_balance: user_balance.fungible_balance.leverage_token_balance,
            is_native: true,
        });

        Ok(())
    }

    pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
        let user_balance = &mut ctx.accounts.user_balance;

        if let Some(token_mint) = &ctx.accounts.token_mint {
            let token_balance = &mut user_balance.fungible_balance;
            require!(
                token_balance.leverage_token_balance >= amount,
                ErrorCode::InsufficientLeverage
            );

            token_balance.leverage_token_balance -= amount;
            token_balance.borrow_token_balance += amount;
            token_balance.user_token_balance += amount;

            emit!(TokenEdit {
                account: ctx.accounts.user.key(),
                token: token_mint.key(),
                amount,
                func: "Borrow".to_string(),
            });
        } else {
            let sol_balance = &mut user_balance.native_balance;

            require!(
                sol_balance.leverage_token_balance >= amount,
                ErrorCode::InsufficientLeverage
            );

            sol_balance.leverage_token_balance -= amount;
            sol_balance.borrow_token_balance += amount;
            sol_balance.user_token_balance += amount;

            emit!(TokenEdit {
                account: ctx.accounts.user.key(),
                token: WSOL_MINT,
                amount,
                func: "Borrow".to_string(),
            });
        }

        Ok(())
    }

    pub fn repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
        let user_balance = &mut ctx.accounts.user_balance;

        if let Some(token_mint) = &ctx.accounts.token_mint {
            let token_balance = &mut user_balance.fungible_balance;
            require!(
                token_balance.borrow_token_balance >= amount,
                ErrorCode::InsufficientBorrowBalance
            );

            token_balance.borrow_token_balance -= amount;
            token_balance.user_token_balance -= amount;
            token_balance.leverage_token_balance += amount;

            emit!(TokenEdit {
                account: ctx.accounts.user.key(),
                token: token_mint.key(),
                amount,
                func: "Repay".to_string(),
            });
        } else {
            let sol_balance = &mut user_balance.native_balance;

            require!(
                sol_balance.borrow_token_balance >= amount,
                ErrorCode::InsufficientBorrowBalance
            );

            sol_balance.borrow_token_balance -= amount;
            sol_balance.user_token_balance -= amount;
            sol_balance.leverage_token_balance += amount;

            emit!(TokenEdit {
                account: ctx.accounts.user.key(),
                token: WSOL_MINT,
                amount,
                func: "Repay".to_string(),
            });
        }
        Ok(())
    }

    pub fn burn(ctx: Context<Burn>, amount: u64) -> Result<()> {
        let user_balance = &mut ctx.accounts.user_balance;

        if let Some(token_mint) = &ctx.accounts.token_mint {
            let mut token_balance = user_balance.fungible_balance.clone();
            require!(
                token_balance.borrow_token_balance == 0,
                ErrorCode::BorrowBalanceNotZero
            );
            require!(
                token_balance.user_token_balance >= amount,
                ErrorCode::InsufficientUserBorrowBalance
            );

            token_balance.deposit_token_balance += amount / 10;
            token_balance.leverage_token_balance += amount;
            token_balance.user_token_balance -= amount;

            emit!(TokenEdit {
                account: ctx.accounts.user.key(),
                token: token_mint.key(),
                amount,
                func: "Burn".to_string(),
            });
        } else {
            let sol_balance = &mut user_balance.native_balance;

            require!(
                sol_balance.borrow_token_balance == 0,
                ErrorCode::BorrowBalanceNotZero
            );
            require!(
                sol_balance.user_token_balance >= amount,
                ErrorCode::InsufficientUserBorrowBalance
            );

            sol_balance.deposit_token_balance += amount / 10;
            sol_balance.leverage_token_balance += amount;
            sol_balance.user_token_balance -= amount;

            emit!(TokenEdit {
                account: ctx.accounts.user.key(),
                token: WSOL_MINT,
                amount,
                func: "Burn".to_string(),
            });
        }
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let user_balance = &mut ctx.accounts.user_balance;
        if let Some(token_mint) = &ctx.accounts.token_mint {
            require!(
                ctx.accounts.token_program.is_some(),
                ErrorCode::TokenProgramMissing
            );
            require!(
                ctx.accounts.vault_token_account.is_some(),
                ErrorCode::VaultTokenAccountMissing
            );
            require!(
                ctx.accounts.user_token_account.is_some(),
                ErrorCode::UserTokenAccountMissing
            );

            let token_balance = &mut user_balance.fungible_balance;

            require!(
                token_balance.borrow_token_balance == 0,
                ErrorCode::BorrowBalanceNotZero
            );
            require!(
                token_balance.deposit_token_balance >= amount,
                ErrorCode::InsufficientUserBorrowBalance
            );

            token_balance.deposit_token_balance -= amount;
            token_balance.leverage_token_balance -= amount * 10;

            // let cpi_accounts = Transfer {
            //     from: ctx
            //         .accounts
            //         .vault_token_account
            //         .as_ref()
            //         .unwrap()
            //         .to_account_info(),
            //     to: ctx
            //         .accounts
            //         .user_token_account
            //         .as_ref()
            //         .unwrap()
            //         .to_account_info(),
            //     authority: ctx.accounts.leverage_account.to_account_info(),
            // };
            // let cpi_program = ctx
            //     .accounts
            //     .token_program
            //     .as_ref()
            //     .unwrap()
            //     .to_account_info();
            // let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            // token::transfer(cpi_ctx, amount)?;

            emit!(TokenEdit {
                account: ctx.accounts.user.key(),
                token: token_mint.key(),
                amount,
                func: "Withdraw".to_string(),
            });
        } else {
            let sol_balance = &mut user_balance.native_balance;

            require!(
                sol_balance.borrow_token_balance == 0,
                ErrorCode::BorrowBalanceNotZero
            );
            require!(
                sol_balance.deposit_token_balance >= amount,
                ErrorCode::InsufficientUserBorrowBalance
            );

            sol_balance.deposit_token_balance -= amount;
            sol_balance.leverage_token_balance -= amount * 10;

            **ctx
                .accounts
                .leverage_account
                .to_account_info()
                .try_borrow_mut_lamports()? -= amount;
            **ctx
                .accounts
                .user
                .to_account_info()
                .try_borrow_mut_lamports()? += amount;

            emit!(TokenEdit {
                account: ctx.accounts.user.key(),
                token: WSOL_MINT,
                amount,
                func: "Withdraw".to_string(),
            });
        }

        Ok(())
    }

    // let user_balance = &mut ctx.accounts.user_balance;
    pub fn order_execute(
        ctx: Context<OrderExecute>,
        order_id: String,
        amount_in: u64,
        amount_out: u64,
    ) -> Result<()> {
        let user_balance = &mut ctx.accounts.user_balance;
        if ctx.accounts.token_in.key() == WSOL_MINT {
            require!(
                user_balance.native_balance.borrow_token_balance >= amount_in,
                ErrorCode::InsufficientBalance
            );
            user_balance.native_balance.borrow_token_balance -= amount_in;
            user_balance.native_balance.user_token_balance -= amount_in;
            user_balance.fungible_balance.user_token_balance += amount_out;
        } else {
            require!(
                user_balance.fungible_balance.borrow_token_balance >= amount_in,
                ErrorCode::InsufficientBalance
            );
            user_balance.fungible_balance.borrow_token_balance -= amount_in;
            user_balance.fungible_balance.user_token_balance -= amount_in;
            user_balance.native_balance.user_token_balance += amount_out;
        }

        let order_state = OrderState {
            order_id: order_id,
            sell_token: ctx.accounts.token_in.key(),
            buy_token: ctx.accounts.token_out.key(),
            sell_token_amount: amount_in,
            buy_token_amount: amount_out,
            timestamp: Clock::get()?.unix_timestamp,
            status: OrderStatus::Fulfilled,
        };

        ctx.accounts
            .user_order_state
            .orders
            .push(order_state.clone());

        emit!(TokenOrder {
            user: ctx.accounts.user.key(),
            order: order_state,
        });

        Ok(())
    }
}
