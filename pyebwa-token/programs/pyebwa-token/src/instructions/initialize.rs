use anchor_lang::prelude::*;
use crate::state::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeParams {
    pub token_price: u64,
    pub tree_fund_rate: u16,
    pub tree_payment_rate: u64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = TokenPool::SIZE,
        seeds = [b"token_pool"],
        bump
    )]
    pub token_pool: Account<'info, TokenPool>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
    let token_pool = &mut ctx.accounts.token_pool;
    
    token_pool.authority = ctx.accounts.authority.key();
    token_pool.total_supply = 0;
    token_pool.trees_funded = 0;
    token_pool.heritage_preserved = 0;
    token_pool.token_price = params.token_price;
    token_pool.tree_fund_rate = params.tree_fund_rate;
    token_pool.tree_payment_rate = params.tree_payment_rate;
    token_pool.bump = ctx.bumps.token_pool;
    
    Ok(())
}