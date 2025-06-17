use anchor_lang::prelude::*;

#[account]
pub struct TokenPool {
    pub authority: Pubkey,
    pub total_supply: u64,
    pub trees_funded: u64,
    pub heritage_preserved: u64,
    pub token_price: u64,        // In lamports
    pub tree_fund_rate: u16,     // Basis points (10000 = 100%)
    pub tree_payment_rate: u64,  // Tokens per tree
    pub bump: u8,
}

impl TokenPool {
    pub const SIZE: usize = 8 + // discriminator
        32 + // authority
        8 +  // total_supply
        8 +  // trees_funded
        8 +  // heritage_preserved
        8 +  // token_price
        2 +  // tree_fund_rate
        8 +  // tree_payment_rate
        1;   // bump
}