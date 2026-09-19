#![no_std]
//! The fallback treasury: plain USDC, no strategy.
//!
//! Implements the same interface the vault adapter does, so the invoice
//! contract cannot tell them apart. If DeFindex is unreachable the product
//! still runs — the yield component of the discount simply falls back to a
//! parameter, and the quote says so.

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, panic_with_error, token, Address, Env};

#[contracttype]
pub enum DataKey {
    Token,
    Admin,
    /// Only this address may draw funds out.
    Controller,
    ApyBps,
}

#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    InsufficientFunds = 4,
}

#[contract]
pub struct LocalTreasury;

#[contractimpl]
impl LocalTreasury {
    pub fn init(env: Env, admin: Address, token: Address, apy_bps: u32) {
        if env.storage().instance().has(&DataKey::Token) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::ApyBps, &apy_bps);
        // Until a controller is set, the admin is the only one who can withdraw.
        env.storage().instance().set(&DataKey::Controller, &admin);
    }

    /// Hand withdrawal rights to the invoice contract.
    ///
    /// Without this the pool would be drainable by anyone who could call
    /// `withdraw` — the bug this contract was written with, and the reason the
    /// controller exists at all.
    pub fn set_controller(env: Env, controller: Address) {
        admin(&env).require_auth();
        env.storage()
            .instance()
            .set(&DataKey::Controller, &controller);
    }

    pub fn apy_bps(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::ApyBps).unwrap_or(0)
    }

    pub fn set_apy_bps(env: Env, apy_bps: u32) {
        admin(&env).require_auth();
        env.storage().instance().set(&DataKey::ApyBps, &apy_bps);
    }

    /// Take `amount` from `from`. The signature has to be at the root of the
    /// invocation, which is why this asks for it here rather than relying on
    /// the caller having asked.
    pub fn deposit(env: Env, from: Address, amount: i128) {
        from.require_auth();
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        token::Client::new(&env, &token_addr(&env)).transfer(
            &from,
            &env.current_contract_address(),
            &amount,
        );
    }

    pub fn withdraw(env: Env, to: Address, amount: i128) {
        controller(&env).require_auth();
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let client = token::Client::new(&env, &token_addr(&env));
        if client.balance(&env.current_contract_address()) < amount {
            panic_with_error!(&env, Error::InsufficientFunds);
        }
        client.transfer(&env.current_contract_address(), &to, &amount);
    }

    pub fn total_assets(env: Env) -> i128 {
        token::Client::new(&env, &token_addr(&env)).balance(&env.current_contract_address())
    }
}

fn admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

fn controller(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Controller)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

fn token_addr(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Token)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}
