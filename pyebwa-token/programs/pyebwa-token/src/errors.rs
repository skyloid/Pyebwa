use anchor_lang::prelude::*;

#[error_code]
pub enum PyebwaError {
    #[msg("Insufficient token balance")]
    InsufficientBalance,
    
    #[msg("Invalid GPS coordinates")]
    InvalidGPSCoordinates,
    
    #[msg("IPFS hash too long")]
    IPFSHashTooLong,
    
    #[msg("Evidence already verified")]
    AlreadyVerified,
    
    #[msg("Planter not verified")]
    PlanterNotVerified,
    
    #[msg("Invalid tree count")]
    InvalidTreeCount,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Math overflow")]
    MathOverflow,
    
    #[msg("Invalid heritage type")]
    InvalidHeritageType,
    
    #[msg("Payment already released")]
    PaymentAlreadyReleased,
}