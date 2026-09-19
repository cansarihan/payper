#![no_std]
//! A SEP-40 shaped TRY/USD feed for testnet.
//!
//! Reflector publishes a lira price on mainnet only; its testnet deployment
//! carries EUR, GBP, CHF, CAD, MXN, ARS, BRL, THB and XAU, and no TRY. Even on
//! mainnet the readable history is about two hours, which cannot price a
//! ninety-day receivable.
//!
//! So this mirrors the interface rather than inventing one: the same
//! `lastprice` / `prices` / `decimals` surface the pricing engine reads on
//! mainnet, filled with real ECB daily closes plus Reflector's own live mainnet
//! price. Pointing the invoice contract at Reflector on mainnet is an address
//! change, not a code change.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    Env, Symbol, Vec, vec,
};

#[contracttype]
#[derive(Clone)]
pub enum Asset {
    Stellar(Address),
    Other(Symbol),
}

#[contracttype]
#[derive(Clone, Copy)]
pub struct PriceData {
    pub price: i128,
    pub timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Publisher,
    Decimals,
    Resolution,
    Capacity,
    /// Newest-first ring of samples.
    Samples,
}

#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidPrice = 4,
    Empty = 5,
}

#[contract]
pub struct FxOracle;

#[contractimpl]
impl FxOracle {
    pub fn init(env: Env, admin: Address, publisher: Address, decimals: u32, resolution: u32, capacity: u32) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Publisher, &publisher);
        env.storage().instance().set(&DataKey::Decimals, &decimals);
        env.storage().instance().set(&DataKey::Resolution, &resolution);
        env.storage().instance().set(&DataKey::Capacity, &capacity);
        env.storage()
            .instance()
            .set(&DataKey::Samples, &vec![&env] as &Vec<PriceData>);
    }

    pub fn set_publisher(env: Env, publisher: Address) {
        admin(&env).require_auth();
        env.storage().instance().set(&DataKey::Publisher, &publisher);
    }

    pub fn publish(env: Env, price: i128, timestamp: u64) {
        publisher(&env).require_auth();
        append(&env, price, timestamp);
    }

    /// Seed a run of history in one call.
    ///
    /// Authorization is taken once for the batch rather than per sample:
    /// requiring it inside the loop fails with `Error(Auth, ExistingValue)`
    /// on the second iteration, because the frame is already authorized.
    pub fn publish_batch(env: Env, prices: Vec<i128>, start: u64, step: u64) {
        publisher(&env).require_auth();
        for (i, price) in prices.iter().enumerate() {
            append(&env, price, start + (i as u64) * step);
        }
    }

    pub fn decimals(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Decimals).unwrap_or(14)
    }

    pub fn resolution(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Resolution).unwrap_or(300)
    }

    pub fn lastprice(env: Env, _asset: Asset) -> Option<PriceData> {
        samples(&env).get(0)
    }

    /// Newest first, capped at `records`, matching Reflector's own ordering.
    pub fn prices(env: Env, _asset: Asset, records: u32) -> Option<Vec<PriceData>> {
        let all = samples(&env);
        if all.is_empty() {
            return None;
        }
        let take = if records < all.len() { records } else { all.len() };
        let mut out = vec![&env];
        for i in 0..take {
            out.push_back(all.get(i).unwrap());
        }
        Some(out)
    }

    pub fn price(env: Env, _asset: Asset, timestamp: u64) -> Option<PriceData> {
        samples(&env).iter().find(|s| s.timestamp <= timestamp)
    }

    pub fn last_timestamp(env: Env) -> u64 {
        samples(&env).get(0).map(|s| s.timestamp).unwrap_or(0)
    }

    pub fn sample_count(env: Env) -> u32 {
        samples(&env).len()
    }

    pub fn base(_env: Env) -> Asset {
        Asset::Other(symbol_short!("USD"))
    }
}

fn append(env: &Env, price: i128, timestamp: u64) {
    if price <= 0 {
        panic_with_error!(env, Error::InvalidPrice);
    }
    let capacity: u32 = env.storage().instance().get(&DataKey::Capacity).unwrap_or(400);
    let existing = samples(env);

    let mut next = vec![env, PriceData { price, timestamp }];
    for (i, s) in existing.iter().enumerate() {
        if (i as u32) + 1 >= capacity {
            break;
        }
        next.push_back(s);
    }
    env.storage().instance().set(&DataKey::Samples, &next);
}

fn samples(env: &Env) -> Vec<PriceData> {
    env.storage()
        .instance()
        .get(&DataKey::Samples)
        .unwrap_or_else(|| vec![env])
}

fn admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

fn publisher(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Publisher)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}
