use anchor_lang::prelude::*;

#[account]
pub struct FamilyAccount {
    pub owner: Pubkey,
    pub token_balance: u64,
    pub heritage_items: u32,
    pub trees_funded: u32,
    pub total_spent: u64,
    pub created_at: i64,
    pub bump: u8,
}

impl FamilyAccount {
    pub const SIZE: usize = 8 + // discriminator
        32 + // owner
        8 +  // token_balance
        4 +  // heritage_items
        4 +  // trees_funded
        8 +  // total_spent
        8 +  // created_at
        1;   // bump
}