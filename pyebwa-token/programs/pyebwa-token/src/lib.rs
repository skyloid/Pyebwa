use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod pyebwa_token {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
        instructions::initialize::handler(ctx, params)
    }

    pub fn purchase_tokens(ctx: Context<PurchaseTokens>, amount: u64) -> Result<()> {
        instructions::purchase_tokens::handler(ctx, amount)
    }

    pub fn preserve_heritage(
        ctx: Context<PreserveHeritage>,
        ipfs_hash: String,
        heritage_type: HeritageType,
        token_cost: u64,
    ) -> Result<()> {
        instructions::preserve_heritage::handler(ctx, ipfs_hash, heritage_type, token_cost)
    }

    pub fn submit_planting(
        ctx: Context<SubmitPlanting>,
        tree_count: u16,
        gps_coordinates: [f64; 2],
        evidence_hash: String,
    ) -> Result<()> {
        instructions::submit_planting::handler(ctx, tree_count, gps_coordinates, evidence_hash)
    }

    pub fn verify_planting(ctx: Context<VerifyPlanting>) -> Result<()> {
        instructions::verify_planting::handler(ctx)
    }
}
