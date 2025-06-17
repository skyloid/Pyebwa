use anchor_lang::prelude::*;

#[account]
pub struct PlantingEvidence {
    pub planter: Pubkey,
    pub tree_count: u16,
    pub gps_lat: f64,
    pub gps_lon: f64,
    pub ipfs_hash: String,        // 64 chars max
    pub submitted_at: i64,
    pub verified: bool,
    pub verified_by: Option<Pubkey>,
    pub verified_at: Option<i64>,
    pub payment_released: bool,
    pub bump: u8,
}

impl PlantingEvidence {
    pub const SIZE: usize = 8 + // discriminator
        32 + // planter
        2 +  // tree_count
        8 +  // gps_lat
        8 +  // gps_lon
        4 + 64 + // ipfs_hash (string with length prefix)
        8 +  // submitted_at
        1 +  // verified
        1 + 32 + // verified_by (Option)
        1 + 8 +  // verified_at (Option)
        1 +  // payment_released
        1;   // bump
}