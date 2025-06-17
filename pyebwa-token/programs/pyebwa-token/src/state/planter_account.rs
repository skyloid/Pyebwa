use anchor_lang::prelude::*;

#[account]
pub struct PlanterAccount {
    pub owner: Pubkey,
    pub verified: bool,
    pub trees_planted: u32,
    pub trees_verified: u32,
    pub earnings: u64,
    pub reputation_score: u16,
    pub gps_lat: f64,
    pub gps_lon: f64,
    pub created_at: i64,
    pub bump: u8,
}

impl PlanterAccount {
    pub const SIZE: usize = 8 + // discriminator
        32 + // owner
        1 +  // verified
        4 +  // trees_planted
        4 +  // trees_verified
        8 +  // earnings
        2 +  // reputation_score
        8 +  // gps_lat
        8 +  // gps_lon
        8 +  // created_at
        1;   // bump
}