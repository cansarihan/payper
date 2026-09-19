#![no_std]
//! Treasury backed by a DeFindex vault.
//!
//! The invoice contract knows four functions — `apy_bps`, `deposit`,
//! `withdraw`, `total_assets` — and cannot tell which treasury is behind them.
//! This one holds the position in a DeFindex vault: contributions are deposited
//! for vault shares, a payout burns the shares it needs, and the yield reported
//! to pricing is the vault's own realised rate rather than a parameter.
//!
//! Shares, not amounts, are what the vault moves, so every asset figure here is
//! converted through the vault's own share price. Rounding is deliberately
//! against this contract on withdrawal: asking for one share too many leaves
//! dust behind, asking for one too few leaves the payout short.

mod blend;
mod vault;

use soroban_sdk::{
    auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation},
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, token,
    vec, Address, Env, IntoVal,
};

use crate::blend::BlendPoolClient;
use crate::vault::VaultClient;

#[contracttype]
pub enum DataKey {
    Admin,
    /// The DeFindex vault this treasury holds its position in.
    Vault,
    /// The asset the vault is denominated in. Must be the vault's first asset.
    Token,
    /// Only this address may draw funds out.
    Controller,
    /// Blend v2 pool read for a reference lending rate, and the asset to read.
    BlendPool,
    BlendAsset,
    /// `b_rate` and the ledger time it was sampled at, written once at init.
    /// The rate is measured against this, so nothing about the pool's history
    /// has to be taken on trust.
    BlendMark,
}

#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    InsufficientFunds = 4,
    /// The vault reports no assets, so a share price cannot be formed.
    VaultEmpty = 5,
    /// The vault has not earned anything measurable yet.
    NoYieldYet = 6,
}

/// Blend states `b_rate` with twelve decimals, starting at one.
const BLEND_RATE_ONE: i128 = 1_000_000_000_000;

/// Shortest window the reading is taken over. Blend accrues its reserve to the
/// current ledger on every read, so the index is a smooth function of time
/// rather than a series of jumps, and ten minutes is enough to measure. Under
/// this the reading is refused rather than extrapolated.
const MIN_BLEND_WINDOW: u64 = 600;

/// One year in seconds, for annualising a realised gain.
const YEAR: u64 = 31_536_000;
const BPS: i128 = 10_000;

#[contract]
pub struct DefindexTreasury;

#[contractimpl]
impl DefindexTreasury {
    pub fn init(env: Env, admin: Address, vault: Address, token: Address) {
        if env.storage().instance().has(&DataKey::Vault) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Vault, &vault);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Controller, &admin);
    }

    /// Point at a Blend v2 pool to read a lending rate from, and take the
    /// sample the rate will be measured against.
    ///
    /// The sample is taken here rather than assumed, so the figure this
    /// contract later reports is growth it observed itself over a window it
    /// timed itself. Nothing about the pool before this call is relied on.
    pub fn set_blend_reference(env: Env, pool: Address, asset: Address) {
        admin(&env).require_auth();
        let reserve = BlendPoolClient::new(&env, &pool).get_reserve(&asset);
        env.storage().instance().set(&DataKey::BlendPool, &pool);
        env.storage().instance().set(&DataKey::BlendAsset, &asset);
        env.storage().instance().set(
            &DataKey::BlendMark,
            &(reserve.data.b_rate, env.ledger().timestamp()),
        );
    }

    /// What the reference pool has paid suppliers since the sample, annualised.
    ///
    /// `None` while the window is too short to annualise, or when no pool is
    /// configured — both are reasons to keep quiet rather than guess.
    pub fn blend_apy_bps(env: Env) -> Option<u32> {
        let pool: Address = env.storage().instance().get(&DataKey::BlendPool)?;
        let asset: Address = env.storage().instance().get(&DataKey::BlendAsset)?;
        let (marked, at): (i128, u64) = env.storage().instance().get(&DataKey::BlendMark)?;

        let elapsed = env.ledger().timestamp().saturating_sub(at);
        if elapsed < MIN_BLEND_WINDOW || marked <= 0 {
            return None;
        }

        let now = BlendPoolClient::new(&env, &pool).get_reserve(&asset).data.b_rate;
        annualise_bps(marked, now, elapsed)
    }

    /// Hand withdrawal rights to the invoice contract.
    pub fn set_controller(env: Env, controller: Address) {
        admin(&env).require_auth();
        env.storage()
            .instance()
            .set(&DataKey::Controller, &controller);
    }

    /// Point at a different vault. The position in the old one has to be
    /// withdrawn first; this does not move it.
    pub fn set_vault(env: Env, vault: Address) {
        admin(&env).require_auth();
        env.storage().instance().set(&DataKey::Vault, &vault);
    }

    pub fn vault(env: Env) -> Address {
        stored(&env, DataKey::Vault)
    }

    /// The vault's realised rate, annualised.
    ///
    /// `report()` returns what each strategy has gained against the balance it
    /// was last measured at. This deliberately refuses rather than substituting
    /// a parameter when there is nothing to measure: pricing reads it with
    /// `try_apy_bps` and labels a failed read `Fallback`, so a refusal is
    /// reported honestly while a substituted number would arrive wearing the
    /// live badge.
    pub fn apy_bps(env: Env) -> u32 {
        let client = VaultClient::new(&env, &stored::<Address>(&env, DataKey::Vault));
        let reports = match client.try_report() {
            Ok(Ok(r)) => r,
            _ => panic_with_error!(&env, Error::NoYieldYet),
        };

        let mut base: i128 = 0;
        let mut gains: i128 = 0;
        for report in reports.iter() {
            base += report.prev_balance;
            gains += report.gains_or_losses;
        }
        // Nothing realised in the vault itself. The reference pool is the next
        // honest reading: it is what this capital earns lending on Stellar,
        // which is the cost of money the discount is meant to carry. It is read
        // from chain like the vault's own figure, not substituted from config.
        if base <= 0 || gains <= 0 {
            return match Self::blend_apy_bps(env.clone()) {
                Some(bps) => bps,
                None => panic_with_error!(&env, Error::NoYieldYet),
            };
        }

        // The report carries no timestamp, so the rate is measured from this
        // contract's first deposit. Without that anchor the only honest reading
        // is the raw return, un-annualised.
        let elapsed = elapsed_seconds(&env);
        let period_bps = (gains * BPS) / base;
        let annual = if elapsed >= YEAR || elapsed == 0 {
            period_bps
        } else {
            (period_bps * YEAR as i128) / elapsed as i128
        };
        if annual <= 0 {
            return match Self::blend_apy_bps(env.clone()) {
                Some(bps) => bps,
                None => panic_with_error!(&env, Error::NoYieldYet),
            };
        }
        annual.min(u32::MAX as i128) as u32
    }

    /// Take `amount` from `from` and put it into the vault.
    ///
    /// The vault credits shares to whoever it pulled the asset from, so the
    /// asset is pulled here first and deposited by this contract: the position
    /// has to belong to the treasury, not to the funder who contributed it.
    pub fn deposit(env: Env, from: Address, amount: i128) {
        from.require_auth();
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let this = env.current_contract_address();
        let token_addr: Address = stored(&env, DataKey::Token);
        token::Client::new(&env, &token_addr).transfer(&from, &this, &amount);

        if !env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::NotInitialized);
        }
        mark_start(&env);

        let vault_addr: Address = stored(&env, DataKey::Vault);
        // The vault pulls the asset with a plain `transfer` one frame deeper
        // than this call, so this contract has to authorise that invocation
        // explicitly — an allowance would not be consulted.
        authorize_vault_pull(&env, &token_addr, &vault_addr, amount);
        VaultClient::new(&env, &vault_addr).deposit(
            &vec![&env, amount],
            &vec![&env, amount],
            &this,
            &true,
        );
    }

    /// Burn the shares that `amount` is worth and send the asset to `to`.
    pub fn withdraw(env: Env, to: Address, amount: i128) {
        controller(&env).require_auth();
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let this = env.current_contract_address();
        let vault_addr: Address = stored(&env, DataKey::Vault);
        let client = VaultClient::new(&env, &vault_addr);

        let managed = total_managed(&client);
        let supply = client.total_supply();
        if managed <= 0 || supply <= 0 {
            panic_with_error!(&env, Error::VaultEmpty);
        }

        // Round up: a share short leaves the payout short, and the payout is
        // what a funder was promised.
        let shares = (amount * supply + managed - 1) / managed;
        if shares > client.balance(&this) {
            panic_with_error!(&env, Error::InsufficientFunds);
        }

        client.withdraw(&shares, &vec![&env, amount], &this);

        let token_client = token::Client::new(&env, &stored::<Address>(&env, DataKey::Token));
        if token_client.balance(&this) < amount {
            panic_with_error!(&env, Error::InsufficientFunds);
        }
        token_client.transfer(&this, &to, &amount);
    }

    /// What this treasury's shares are worth, plus anything not yet deposited.
    pub fn total_assets(env: Env) -> i128 {
        let this = env.current_contract_address();
        let idle = token::Client::new(&env, &stored::<Address>(&env, DataKey::Token)).balance(&this);

        let client = VaultClient::new(&env, &stored::<Address>(&env, DataKey::Vault));
        let supply = match client.try_total_supply() {
            Ok(Ok(s)) => s,
            _ => return idle,
        };
        if supply <= 0 {
            return idle;
        }
        let managed = match client.try_fetch_total_managed_funds() {
            Ok(Ok(funds)) => funds.iter().map(|f| f.total_amount).sum::<i128>(),
            _ => return idle,
        };
        let shares = match client.try_balance(&this) {
            Ok(Ok(b)) => b,
            _ => return idle,
        };
        idle + (shares * managed) / supply
    }
}

/// Let the vault move `amount` out of this contract, and nothing else.
fn authorize_vault_pull(env: &Env, token: &Address, vault: &Address, amount: i128) {
    env.authorize_as_current_contract(vec![
        env,
        InvokerContractAuthEntry::Contract(SubContractInvocation {
            context: ContractContext {
                contract: token.clone(),
                fn_name: symbol_short!("transfer"),
                args: (env.current_contract_address(), vault.clone(), amount).into_val(env),
            },
            sub_invocations: vec![env],
        }),
    ]);
}

fn total_managed(client: &VaultClient) -> i128 {
    client
        .fetch_total_managed_funds()
        .iter()
        .map(|f| f.total_amount)
        .sum()
}

/// When this treasury first held a position, for annualising the vault's gain.
fn mark_start(env: &Env) {
    if !env.storage().instance().has(&DataKey::Controller) {
        return;
    }
    let key = symbol_start();
    if !env.storage().instance().has(&key) {
        env.storage().instance().set(&key, &env.ledger().timestamp());
    }
}

/// Growth between two readings of a twelve-decimal index, annualised in bps.
///
/// The multiplication has to come first. An hour of lending accrues far less
/// than one basis point, so dividing to bps before scaling to a year truncates
/// the whole measurement to zero and the reading disappears — which is how the
/// first version of this silently reported nothing at all.
fn annualise_bps(marked: i128, now: i128, elapsed: u64) -> Option<u32> {
    if marked <= 0 || now <= marked || elapsed == 0 {
        return None;
    }
    let annual = ((now - marked) * BPS * YEAR as i128) / (marked * elapsed as i128);
    if annual <= 0 {
        return None;
    }
    Some(annual.min(u32::MAX as i128) as u32)
}

fn elapsed_seconds(env: &Env) -> u64 {
    let started: u64 = env.storage().instance().get(&symbol_start()).unwrap_or(0);
    if started == 0 {
        return 0;
    }
    env.ledger().timestamp().saturating_sub(started)
}

fn symbol_start() -> soroban_sdk::Symbol {
    soroban_sdk::symbol_short!("start")
}

fn admin(env: &Env) -> Address {
    stored(env, DataKey::Admin)
}

fn controller(env: &Env) -> Address {
    stored(env, DataKey::Controller)
}

fn stored<T: soroban_sdk::TryFromVal<Env, soroban_sdk::Val>>(env: &Env, key: DataKey) -> T {
    env.storage()
        .instance()
        .get(&key)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

#[cfg(test)]
mod test {
    use super::annualise_bps;

    /// Two readings of the Blend testnet USDC pool, eighty-five minutes apart.
    /// The growth is real but tiny, which is exactly the case that used to
    /// round away to nothing.
    const EARLIER: i128 = 1_056_377_769_408;
    const LATER: i128 = 1_056_380_003_999;

    #[test]
    fn an_hours_growth_survives_the_arithmetic() {
        let bps = annualise_bps(EARLIER, LATER, 5_100).expect("a real reading");
        assert_eq!(bps, 130, "roughly 1.3% a year, which is what the pool pays");
    }

    #[test]
    fn a_ten_minute_window_still_reads() {
        // A tenth of the growth over a tenth of the window is the same rate.
        let later = EARLIER + (LATER - EARLIER) / 10;
        let bps = annualise_bps(EARLIER, later, 510).expect("a real reading");
        assert!((129..=131).contains(&bps), "same rate, shorter window: {bps}");
    }

    #[test]
    fn nothing_is_reported_without_growth() {
        assert_eq!(annualise_bps(EARLIER, EARLIER, 5_100), None);
        assert_eq!(annualise_bps(EARLIER, EARLIER - 1, 5_100), None);
        assert_eq!(annualise_bps(0, LATER, 5_100), None);
        assert_eq!(annualise_bps(EARLIER, LATER, 0), None);
    }

    /// A year of the same rate annualises to itself.
    #[test]
    fn a_full_year_reports_its_own_return() {
        let year = 31_536_000u64;
        let bps = annualise_bps(1_000_000_000_000, 1_074_500_000_000, year).unwrap();
        assert_eq!(bps, 745);
    }
}
