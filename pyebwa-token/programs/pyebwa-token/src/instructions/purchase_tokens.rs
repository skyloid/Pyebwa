use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;
use crate::state::*;
use crate::errors::PyebwaError;

#[derive(Accounts)]
pub struct PurchaseTokens<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        init_if_needed,
        payer = buyer,
        space = FamilyAccount::SIZE,
        seeds = [b"family", buyer.key().as_ref()],
        bump
    )]
    pub family_account: Account<'info, FamilyAccount>,
    
    #[account(
        mut,
        seeds = [b"token_pool"],
        bump = token_pool.bump
    )]
    pub token_pool: Account<'info, TokenPool>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PurchaseTokens>, amount: u64) -> Result<()> {
    let token_pool = &mut ctx.accounts.token_pool;
    let family_account = &mut ctx.accounts.family_account;
    
    // Calculate cost in lamports
    let cost = amount
        .checked_mul(token_pool.token_price)
        .ok_or(PyebwaError::MathOverflow)?;
    
    // Transfer SOL from buyer to token pool
    invoke(
        &system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.token_pool.to_account_info().key(),
            cost,
        ),
        &[
            ctx.accounts.buyer.to_account_info(),
            ctx.accounts.token_pool.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;
    
    // Initialize family account if new
    if family_account.owner == Pubkey::default() {
        family_account.owner = ctx.accounts.buyer.key();
        family_account.created_at = Clock::get()?.unix_timestamp;
        family_account.bump = ctx.bumps.family_account;
    }
    
    // Update balances
    family_account.token_balance = family_account.token_balance
        .checked_add(amount)
        .ok_or(PyebwaError::MathOverflow)?;
    
    token_pool.total_supply = token_pool.total_supply
        .checked_add(amount)
        .ok_or(PyebwaError::MathOverflow)?;
    
    // Update token price (0.01% increase per million tokens)
    if token_pool.total_supply % 1_000_000 == 0 {
        token_pool.token_price = token_pool.token_price
            .checked_mul(10001)
            .ok_or(PyebwaError::MathOverflow)?
            .checked_div(10000)
            .ok_or(PyebwaError::MathOverflow)?;
    }
    
    msg!("Purchased {} tokens for {} lamports", amount, cost);
    
    Ok(())
}