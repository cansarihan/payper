use soroban_sdk::Env;

use crate::types::{Config, Invoice, OracleClient, Quote, ReflectorAsset, Source, TreasuryClient};

const BPS: i128 = 10_000;
const DAY: u64 = 86_400;
const YEAR_DAYS: u64 = 365;

/// The treasury's strategy yield, or the configured stand-in.
///
/// `try_apy_bps` rather than `apy_bps`: a vault that has been paused, drained
/// or redeployed should degrade the quote, not abort the call — but the caller
/// has to be told which happened, which is what `Source` carries.
fn read_apy(env: &Env, cfg: &Config) -> (u32, Source) {
    let client = TreasuryClient::new(env, &cfg.treasury);
    match client.try_apy_bps() {
        Ok(Ok(bps)) => (bps, Source::Live),
        _ => (cfg.fallback_apy_bps, Source::Fallback),
    }
}

/// Currency risk, measured rather than assumed.
///
/// Two observations out of the same window. `drift` is how much the lira
/// actually weakened across it, projected onto the tenor — this dominates,
/// because a currency that loses ground steadily will keep doing so over the
/// ninety days the funder is exposed. `range` is the peak-to-trough spread, and
/// half of it is added as a volatility allowance: a feed that swings widely is
/// riskier at the same drift.
///
/// Returns bps for the tenor, plus the raw observations so the interface can
/// show its working instead of asking to be believed.
fn read_fx(env: &Env, cfg: &Config, days: u64) -> (u32, Source, u32, u32, u64) {
    let oracle = match &cfg.oracle {
        Some(address) => OracleClient::new(env, address),
        None => return (fallback_fx(cfg, days), Source::Fallback, 0, 0, 0),
    };
    let asset = ReflectorAsset::Other(cfg.oracle_asset.clone());

    let samples = match oracle.try_prices(&asset, &cfg.oracle_samples) {
        Ok(Ok(Some(rows))) if rows.len() >= 2 => rows,
        _ => return (fallback_fx(cfg, days), Source::Fallback, 0, 0, 0),
    };

    // The feed returns newest first.
    let newest = samples.get(0).unwrap();
    let oldest = samples.get(samples.len() - 1).unwrap();
    if newest.price <= 0 || oldest.price <= 0 {
        return (fallback_fx(cfg, days), Source::Fallback, 0, 0, 0);
    }

    let mut max = newest.price;
    let mut min = newest.price;
    for s in samples.iter() {
        if s.price > max {
            max = s.price;
        }
        if s.price < min {
            min = s.price;
        }
    }

    let window_days = if newest.timestamp > oldest.timestamp {
        ((newest.timestamp - oldest.timestamp) / DAY).max(1)
    } else {
        1
    };

    // The feed quotes fiat per USD, so a *falling* number means the lira gained.
    // Only weakening costs the funder anything.
    let drift_bps: u32 = if newest.price > oldest.price {
        (((newest.price - oldest.price) * BPS) / oldest.price) as u32
    } else {
        0
    };

    let mid = (max + min) / 2;
    let range_bps: u32 = if mid > 0 {
        (((max - min) * BPS) / mid) as u32
    } else {
        0
    };

    let projected = ((drift_bps as u64) * days / window_days) as u32;
    let premium = projected.saturating_add(range_bps / 2);
    let clamped = premium.max(cfg.fx_floor_bps).min(cfg.fx_cap_bps);

    (clamped, Source::Live, drift_bps, range_bps, window_days)
}

/// Expressed per annum and scaled, so a 30-day invoice is not charged what a
/// 120-day one is.
fn fallback_fx(cfg: &Config, days: u64) -> u32 {
    let scaled = ((cfg.fallback_fx_annual_bps as u64) * days / YEAR_DAYS) as u32;
    scaled.max(cfg.fx_floor_bps).min(cfg.fx_cap_bps)
}

pub fn compute_quote(env: &Env, cfg: &Config, invoice: &Invoice) -> Quote {
    let now = env.ledger().timestamp();
    let days = if invoice.due_date > now {
        ((invoice.due_date - now) / DAY).max(1)
    } else {
        1
    };

    let (apy_bps, yield_source) = read_apy(env, cfg);
    let yield_bps = ((apy_bps as u64) * days / YEAR_DAYS) as u32;

    let (fx_risk_bps, fx_source, fx_drift_bps, fx_range_bps, fx_window_days) =
        read_fx(env, cfg, days);

    let total_discount_bps = yield_bps
        .saturating_add(fx_risk_bps)
        .saturating_add(cfg.credit_premium_bps)
        .saturating_add(cfg.platform_fee_bps);

    let keep = BPS - (total_discount_bps as i128);
    let payout_fiat = invoice.amount_fiat * keep / BPS;
    let payout_usdc = invoice.face_usdc * keep / BPS;

    Quote {
        invoice_id: invoice.id,
        days,
        yield_bps,
        yield_source,
        fx_risk_bps,
        fx_source,
        credit_premium_bps: cfg.credit_premium_bps,
        platform_fee_bps: cfg.platform_fee_bps,
        total_discount_bps,
        payout_fiat,
        payout_usdc,
        apy_bps,
        fx_drift_bps,
        fx_range_bps,
        fx_window_days,
    }
}
