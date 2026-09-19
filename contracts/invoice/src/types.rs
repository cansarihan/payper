use soroban_sdk::{contracterror, contracttype, Address, BytesN, Env, Symbol, Vec};

/// Where a number in a quote came from.
///
/// Carried in the quote itself rather than inferred, because a price presented
/// as live while quietly using a constant is worse than a constant.
#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Source {
    /// Read from chain during this call.
    Live = 0,
    /// The chain read failed and a configured value stood in.
    Fallback = 1,
    /// Never was a chain value; a parameter.
    Param = 2,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Status {
    Registered = 0,
    Acknowledged = 1,
    Funded = 2,
    Repaid = 3,
    Defaulted = 4,
}

#[contracttype]
#[derive(Clone)]
pub struct Invoice {
    pub id: u32,
    pub seller: Address,
    pub buyer: Address,
    /// SHA-256 of the invoice's ETTN. The uniqueness guarantee hangs on this.
    pub ettn_hash: BytesN<32>,
    /// SHA-256 of the whole document, so the financed bytes are pinned.
    pub doc_hash: BytesN<32>,
    pub seller_tax_id: Symbol,
    pub buyer_tax_id: Symbol,
    /// Face value in fiat minor units (kuruş).
    pub amount_fiat: i128,
    /// Face value in USDC stroops at acceptance.
    pub face_usdc: i128,
    pub due_date: u64,
    pub status: Status,
    pub funded_amount: i128,
    /// Zero until a quote is accepted; then the discount is fixed.
    pub locked_discount_bps: u32,
    pub locked_payout_usdc: i128,
    pub created_at: u64,
}

/// A price, with every component's provenance attached.
#[contracttype]
#[derive(Clone)]
pub struct Quote {
    pub invoice_id: u32,
    pub days: u64,
    /// Treasury strategy APY, scaled to the tenor.
    pub yield_bps: u32,
    pub yield_source: Source,
    /// Currency risk, from the observed move in the feed.
    pub fx_risk_bps: u32,
    pub fx_source: Source,
    pub credit_premium_bps: u32,
    pub platform_fee_bps: u32,
    pub total_discount_bps: u32,
    pub payout_fiat: i128,
    pub payout_usdc: i128,
    /// The inputs behind fx_risk_bps, so the interface can show its working.
    pub apy_bps: u32,
    pub fx_drift_bps: u32,
    pub fx_range_bps: u32,
    pub fx_window_days: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct Funding {
    pub funder: Address,
    pub amount: i128,
    pub at: u64,
}

/// What a default paid out, and what is still claimed.
#[contracttype]
#[derive(Clone, Debug)]
pub struct DefaultOutcome {
    pub invoice_id: u32,
    pub from_first_loss: i128,
    pub seller_recourse: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct Config {
    pub admin: Address,
    /// Contract implementing the treasury adapter.
    pub treasury: Address,
    /// USDC token contract (Stellar Asset Contract).
    pub token: Address,
    /// SEP-40 compatible price oracle. Absent => fx always falls back.
    pub oracle: Option<Address>,
    /// Oracle asset symbol for the fiat leg, e.g. "TRY".
    pub oracle_asset: Symbol,
    /// How many historical samples to read for the volatility estimate.
    pub oracle_samples: u32,
    pub credit_premium_bps: u32,
    pub platform_fee_bps: u32,
    /// Used when the vault's APY cannot be read.
    pub fallback_apy_bps: u32,
    /// Used when the oracle has no usable history. Expressed per annum and
    /// scaled to the tenor, so a fallback quote stays comparable to a live one
    /// instead of charging a 30-day invoice the same as a 120-day one.
    pub fallback_fx_annual_bps: u32,
    /// Lower bound: currency risk is never priced at zero.
    pub fx_floor_bps: u32,
    /// Sanity bound against a malfunctioning feed, not a pricing dial.
    pub fx_cap_bps: u32,
    /// Contributions strictly above this (USDC stroops) require a licensed funder.
    pub whitelist_threshold: i128,
    /// How long after the due date before a default may be declared.
    pub grace_period: u64,
    /// How long an accepted quote stays fundable, in seconds.
    ///
    /// Sized to the product, not to an FX quote: a round fills from several
    /// funders and no crowd forms in ten minutes. A day is short enough that
    /// the rate cannot drift materially against a tenor-length premium.
    pub quote_ttl: u64,
}

#[contracttype]
pub enum DataKey {
    Config,
    NextId,
    Invoice(u32),
    /// ETTN hash -> invoice id. Presence of this key is what makes an ETTN used.
    Ettn(BytesN<32>),
    /// Per-invoice funder ledger.
    Funders(u32),
    /// Pooled first-loss buffer, in USDC stroops.
    FirstLoss,
    Whitelist(Address),
    /// An accepted quote's validity window. Temporary on purpose: the point is
    /// that it disappears on its own.
    QuoteLock(u32),
}

#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    EttnAlreadyUsed = 4,
    InvoiceNotFound = 5,
    InvalidStatus = 6,
    InvalidAmount = 7,
    InvalidDueDate = 8,
    Oversubscribed = 9,
    InsufficientLiquidity = 10,
    NotWhitelisted = 11,
    NotYetDue = 12,
    NoQuoteAccepted = 13,
    QuoteExpired = 14,
}

/// The treasury the pool's capital sits in.
///
/// The invoice contract knows this interface and nothing else, so the vault
/// behind it can be swapped — or fail — without the flow changing shape.
#[soroban_sdk::contractclient(name = "TreasuryClient")]
pub trait TreasuryAdapter {
    fn apy_bps(env: Env) -> u32;
    fn deposit(env: Env, from: Address, amount: i128);
    fn withdraw(env: Env, to: Address, amount: i128);
    fn total_assets(env: Env) -> i128;
}

/// SEP-40 shaped price feed.
#[contracttype]
#[derive(Clone)]
pub enum ReflectorAsset {
    Stellar(Address),
    Other(Symbol),
}

#[contracttype]
#[derive(Clone)]
pub struct PriceData {
    pub price: i128,
    pub timestamp: u64,
}

#[soroban_sdk::contractclient(name = "OracleClient")]
pub trait ReflectorOracle {
    fn lastprice(env: Env, asset: ReflectorAsset) -> Option<PriceData>;
    fn prices(env: Env, asset: ReflectorAsset, records: u32) -> Option<Vec<PriceData>>;
    fn decimals(env: Env) -> u32;
}
