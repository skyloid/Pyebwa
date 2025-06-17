use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PyebwaError;

#[derive(Accounts)]
pub struct PreserveHeritage<'info> {
    #[account(mut)]
    pub family: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"family", family.key().as_ref()],
        bump = family_account.bump,
        has_one = owner @ PyebwaError::Unauthorized
    )]
    pub family_account: Account<'info, FamilyAccount>,
    
    #[account(
        mut,
        seeds = [b"token_pool"],
        bump = token_pool.bump
    )]
    pub token_pool: Account<'info, TokenPool>,
    
    /// CHECK: Tree fund account that receives portion of tokens
    #[account(
        mut,
        seeds = [b"tree_fund"],
        bump
    )]
    pub tree_fund: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<PreserveHeritage>,
    ipfs_hash: String,
    heritage_type: HeritageType,
    token_cost: u64,
) -> Result<()> {
    let family_account = &mut ctx.accounts.family_account;
    let token_pool = &mut ctx.accounts.token_pool;
    
    // Validate IPFS hash length
    require!(
        ipfs_hash.len() <= 64,
        PyebwaError::IPFSHashTooLong
    );
    
    // Check sufficient balance
    require!(
        family_account.token_balance >= token_cost,
        PyebwaError::InsufficientBalance
    );
    
    // Calculate tree funding amount (based on tree_fund_rate)
    let tree_funding = token_cost
        .checked_mul(token_pool.tree_fund_rate as u64)
        .ok_or(PyebwaError::MathOverflow)?
        .checked_div(10000)
        .ok_or(PyebwaError::MathOverflow)?;
    
    // Deduct tokens from family account
    family_account.token_balance = family_account.token_balance
        .checked_sub(token_cost)
        .ok_or(PyebwaError::MathOverflow)?;
    
    // Update statistics
    family_account.heritage_items = family_account.heritage_items
        .checked_add(1)
        .ok_or(PyebwaError::MathOverflow)?;
    
    family_account.total_spent = family_account.total_spent
        .checked_add(token_cost)
        .ok_or(PyebwaError::MathOverflow)?;
    
    // Calculate trees funded (200 tokens per tree)
    let trees_funded = tree_funding
        .checked_div(token_pool.tree_payment_rate)
        .ok_or(PyebwaError::MathOverflow)?;
    
    family_account.trees_funded = family_account.trees_funded
        .checked_add(trees_funded as u32)
        .ok_or(PyebwaError::MathOverflow)?;
    
    token_pool.heritage_preserved = token_pool.heritage_preserved
        .checked_add(1)
        .ok_or(PyebwaError::MathOverflow)?;
    
    token_pool.trees_funded = token_pool.trees_funded
        .checked_add(trees_funded)
        .ok_or(PyebwaError::MathOverflow)?;
    
    msg!(
        "Preserved {} heritage item for {} tokens, funding {} trees",
        match heritage_type {
            HeritageType::Photo => "photo",
            HeritageType::Document => "document",
            HeritageType::Audio => "audio",
            HeritageType::Video => "video",
        },
        token_cost,
        trees_funded
    );
    
    Ok(())
}