use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Only the owner can perform this action")]
    OnlyOwner,
    #[msg("Value should be greater than zero")]
    ValueShouldBeGreaterThanZero,
    #[msg("Token not listed")]
    TokenNotListed,
    #[msg("Insufficient leverage balance")]
    InsufficientLeverage,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Borrow balance error")]
    BorrowBalanceError,
    #[msg("Token balance not found")]
    TokenBalanceNotFound,
    #[msg("Token program is missing")]
    TokenProgramMissing,
    #[msg("Vault token account is missing")]
    VaultTokenAccountMissing,
    #[msg("User token account is missing")]
    UserTokenAccountMissing,
    #[msg("This token is not found")]
    InvalidToken,
    #[msg("Insufficient borrow balance")]
    InsufficientBorrowBalance,
    #[msg("Borrow balance must be zero to burn")]
    BorrowBalanceNotZero,
    #[msg("Insufficient user borrow balance")]
    InsufficientUserBorrowBalance,
    #[msg("Insufficient token balance")]
    InsufficientTokenBalance,
    #[msg("Order not found or not in pending status")]
    OrderNotFound,
    #[msg("Amount mismatch with the original order")]
    AmountMismatch,
}
