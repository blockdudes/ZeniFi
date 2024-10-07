use crate::structs::OrderState;
use anchor_lang::prelude::*;

#[event]
pub struct TokenListUpdate {
    pub owner: Pubkey,
    pub listed_token: Pubkey,
}

#[event]
pub struct TokenDeposit {
    pub depositor: Pubkey,
    pub token: Pubkey,
    pub deposit_token_balance: u64,
    pub leverage_token_balance: u64,
    pub is_native: bool,
}

#[event]
pub struct TokenEdit {
    pub account: Pubkey,
    pub token: Pubkey,
    pub amount: u64,
    pub func: String,
}

#[event]
pub struct OrderExecuted {
    pub user: Pubkey,
    pub order_id: String,
    pub token_in: Pubkey,
    pub token_out: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
}

#[event]
pub struct TokenOrder {
    pub user: Pubkey,
    pub order: OrderState,
}
