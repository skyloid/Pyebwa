use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PyebwaError;

#[derive(Accounts)]
pub struct VerifyPlanting<'info> {
    #[account(mut)]
    pub verifier: Signer<'info>,
    
    #[account(
        seeds = [b"token_pool"],
        bump = token_pool.bump,
        has_one = authority @ PyebwaError::Unauthorized
    )]
    pub token_pool: Account<'info, TokenPool>,
    
    #[account(
        mut,
        seeds = [
            b"evidence",
            planting_evidence.planter.as_ref(),
            planter_account.trees_planted
                .checked_sub(planting_evidence.tree_count as u32)
                .unwrap()
                .to_le_bytes()
                .as_ref()
        ],
        bump = planting_evidence.bump
    )]
    pub planting_evidence: Account<'info, PlantingEvidence>,
    
    #[account(
        mut,
        seeds = [b"planter", planting_evidence.planter.as_ref()],
        bump = planter_account.bump
    )]
    pub planter_account: Account<'info, PlanterAccount>,
    
    /// CHECK: Tree fund account that holds tokens for payment
    #[account(
        mut,
        seeds = [b"tree_fund"],
        bump
    )]
    pub tree_fund: AccountInfo<'info>,
}

pub fn handler(ctx: Context<VerifyPlanting>) -> Result<()> {
    let planting_evidence = &mut ctx.accounts.planting_evidence;
    let planter_account = &mut ctx.accounts.planter_account;
    let token_pool = &ctx.accounts.token_pool;
    
    // Check if already verified
    require!(
        !planting_evidence.verified,
        PyebwaError::AlreadyVerified
    );
    
    // Mark as verified
    planting_evidence.verified = true;
    planting_evidence.verified_by = Some(ctx.accounts.verifier.key());
    planting_evidence.verified_at = Some(Clock::get()?.unix_timestamp);
    
    // Update planter statistics
    planter_account.trees_verified = planter_account.trees_verified
        .checked_add(planting_evidence.tree_count as u32)
        .ok_or(PyebwaError::MathOverflow)?;
    
    // Calculate payment (200 tokens per tree)
    let payment = (planting_evidence.tree_count as u64)
        .checked_mul(token_pool.tree_payment_rate)
        .ok_or(PyebwaError::MathOverflow)?;
    
    // Update earnings
    planter_account.earnings = planter_account.earnings
        .checked_add(payment)
        .ok_or(PyebwaError::MathOverflow)?;
    
    // Update reputation score (max 1000)
    let new_score = planter_account.reputation_score
        .saturating_add(10)
        .min(1000);
    planter_account.reputation_score = new_score;
    
    // Mark payment as ready for release
    planting_evidence.payment_released = true;
    
    msg!(
        "Verified {} trees for planter {}, payment: {} tokens",
        planting_evidence.tree_count,
        planting_evidence.planter,
        payment
    );
    
    Ok(())
}