//! The slice of the Blend v2 pool interface this adapter reads.
//!
//! Only `get_reserve` is declared. The structs mirror `ReserveConfig`,
//! `ReserveData` and `Reserve` in `blend-contracts-v2/pool` field for field,
//! because the generated client has to decode exactly what the deployed pool
//! encodes. The pool accrues the reserve to the current ledger before
//! returning it, so `b_rate` is current as of the call rather than as of the
//! last time somebody touched the pool.

use soroban_sdk::{contractclient, contracttype, Address, Env};

#[contracttype]
#[derive(Clone)]
pub struct ReserveConfig {
    pub index: u32,
    pub decimals: u32,
    pub c_factor: u32,
    pub l_factor: u32,
    pub util: u32,
    pub max_util: u32,
    pub r_base: u32,
    pub r_one: u32,
    pub r_two: u32,
    pub r_three: u32,
    pub reactivity: u32,
    pub supply_cap: i128,
    pub enabled: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct ReserveData {
    pub d_rate: i128,
    /// bToken to underlying, twelve decimals. One at inception, and rising.
    pub b_rate: i128,
    pub ir_mod: i128,
    pub b_supply: i128,
    pub d_supply: i128,
    pub backstop_credit: i128,
    pub last_time: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct Reserve {
    pub asset: Address,
    pub config: ReserveConfig,
    pub data: ReserveData,
    pub scalar: i128,
}

#[contractclient(name = "BlendPoolClient")]
pub trait BlendPool {
    fn get_reserve(env: Env, asset: Address) -> Reserve;
}
