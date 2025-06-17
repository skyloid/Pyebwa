use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PyebwaError;

#[derive(Accounts)]
#[instruction(tree_count: u16)]
pub struct SubmitPlanting<'info> {
    #[account(mut)]
    pub planter: Signer<'info>,
    
    #[account(
        init_if_needed,
        payer = planter,
        space = PlanterAccount::SIZE,
        seeds = [b"planter", planter.key().as_ref()],
        bump
    )]
    pub planter_account: Account<'info, PlanterAccount>,
    
    #[account(
        init,
        payer = planter,
        space = PlantingEvidence::SIZE,
        seeds = [
            b"evidence",
            planter.key().as_ref(),
            planter_account.trees_planted.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub planting_evidence: Account<'info, PlantingEvidence>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SubmitPlanting>,
    tree_count: u16,
    gps_coordinates: [f64; 2],
    evidence_hash: String,
) -> Result<()> {
    let planter_account = &mut ctx.accounts.planter_account;
    let planting_evidence = &mut ctx.accounts.planting_evidence;
    
    // Validate inputs
    require!(
        tree_count > 0 && tree_count <= 1000,
        PyebwaError::InvalidTreeCount
    );
    
    require!(
        evidence_hash.len() <= 64,
        PyebwaError::IPFSHashTooLong
    );
    
    // Validate GPS coordinates (Haiti bounds)
    let [lat, lon] = gps_coordinates;
    require!(
        lat >= 18.0 && lat <= 20.1 && lon >= -74.5 && lon <= -71.6,
        PyebwaError::InvalidGPSCoordinates
    );
    
    // Initialize planter account if new
    if planter_account.owner == Pubkey::default() {
        planter_account.owner = ctx.accounts.planter.key();
        planter_account.created_at = Clock::get()?.unix_timestamp;
        planter_account.bump = ctx.bumps.planter_account;
        planter_account.gps_lat = lat;
        planter_account.gps_lon = lon;
        planter_account.verified = false; // Requires admin verification
    }
    
    // Only verified planters can submit
    require!(
        planter_account.verified,
        PyebwaError::PlanterNotVerified
    );
    
    // Initialize planting evidence
    planting_evidence.planter = ctx.accounts.planter.key();
    planting_evidence.tree_count = tree_count;
    planting_evidence.gps_lat = lat;
    planting_evidence.gps_lon = lon;
    planting_evidence.ipfs_hash = evidence_hash;
    planting_evidence.submitted_at = Clock::get()?.unix_timestamp;
    planting_evidence.verified = false;
    planting_evidence.verified_by = None;
    planting_evidence.verified_at = None;
    planting_evidence.payment_released = false;
    planting_evidence.bump = ctx.bumps.planting_evidence;
    
    // Update planter statistics
    planter_account.trees_planted = planter_account.trees_planted
        .checked_add(tree_count as u32)
        .ok_or(PyebwaError::MathOverflow)?;
    
    msg!(
        "Submitted evidence for {} trees at ({}, {})",
        tree_count,
        lat,
        lon
    );
    
    Ok(())
}