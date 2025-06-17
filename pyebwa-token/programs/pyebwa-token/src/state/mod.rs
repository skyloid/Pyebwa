pub mod token_pool;
pub mod family_account;
pub mod planter_account;
pub mod planting_evidence;

pub use token_pool::*;
pub use family_account::*;
pub use planter_account::*;
pub use planting_evidence::*;

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum HeritageType {
    Photo,
    Document,
    Audio,
    Video,
}