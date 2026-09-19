//! The slice of the DeFindex vault interface this adapter calls.
//!
//! Only the four entry points we need are declared, with the field order the
//! vault publishes, so the generated client encodes what the deployed contract
//! decodes. Taking the whole interface in would pull their error enum and every
//! management function along with it for no benefit.

use soroban_sdk::{contractclient, contracttype, Address, Env, String, Vec};

#[contracttype]
#[derive(Clone)]
pub struct StrategyAllocation {
    pub strategy_address: Address,
    pub amount: i128,
    pub paused: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct CurrentAssetInvestmentAllocation {
    pub asset: Address,
    pub total_amount: i128,
    pub idle_amount: i128,
    pub invested_amount: i128,
    pub strategy_allocations: Vec<StrategyAllocation>,
}

#[contracttype]
#[derive(Clone)]
pub struct Strategy {
    pub address: Address,
    pub name: String,
    pub paused: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct AssetStrategySet {
    pub address: Address,
    pub strategies: Vec<Strategy>,
}

#[contracttype]
#[derive(Clone)]
pub struct Report {
    pub prev_balance: i128,
    pub gains_or_losses: i128,
    pub locked_fee: i128,
}

#[allow(dead_code)]
#[contractclient(name = "VaultClient")]
pub trait Vault {
    fn deposit(
        env: Env,
        amounts_desired: Vec<i128>,
        amounts_min: Vec<i128>,
        from: Address,
        invest: bool,
    ) -> (Vec<i128>, i128, Option<Vec<Option<()>>>);

    fn withdraw(env: Env, df_amount: i128, min_amounts_out: Vec<i128>, from: Address) -> Vec<i128>;

    fn fetch_total_managed_funds(env: Env) -> Vec<CurrentAssetInvestmentAllocation>;

    fn report(env: Env) -> Vec<Report>;

    fn balance(env: Env, id: Address) -> i128;

    fn total_supply(env: Env) -> i128;
}
