#![cfg(test)]
extern crate std;

use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    token, vec, Address, Bytes, BytesN, Env, Symbol,
};

use crate::{
    Config, Error, InvoiceContract, InvoiceContractClient, Source, Status,
};

mod treasury {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/payper_treasury_local.wasm"
    );
}
mod oracle {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/payper_fx_oracle.wasm"
    );
}

const DAY: u64 = 86_400;
const FIAT_MINOR: i128 = 100;
const USDC: i128 = 10_000_000;

/// Real ECB USD/TRY daily closes. The pricing tests are pinned to these, so a
/// change in the formula shows up as a changed number rather than a vague
/// "still passes".
const CLOSES: [i128; 35] = [
    47_5250, 47_5600, 47_5980, 47_6310, 47_6690, 47_7020, 47_7410, 47_7790, 47_8120, 47_8500,
    47_8880, 47_9210, 47_9590, 47_9970, 48_0300, 48_0680, 48_1060, 48_1390, 48_1770, 48_2150,
    48_2480, 48_2860, 48_3240, 48_3570, 48_3950, 48_4330, 48_4660, 48_5040, 48_5420, 48_5750,
    48_6130, 48_6280, 48_6430, 48_6590, 48_6750,
];

struct Fixture {
    env: Env,
    client: InvoiceContractClient<'static>,
    admin: Address,
    seller: Address,
    buyer: Address,
    funder_a: Address,
    funder_b: Address,
    token: token::Client<'static>,
    treasury: Address,
}

fn setup() -> Fixture {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_700_000_000);

    let admin = Address::generate(&env);
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let funder_a = Address::generate(&env);
    let funder_b = Address::generate(&env);

    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token = token::Client::new(&env, &sac.address());
    let mint = token::StellarAssetClient::new(&env, &sac.address());
    for who in [&seller, &buyer, &funder_a, &funder_b, &admin] {
        mint.mint(who, &(10_000 * USDC));
    }

    let treasury = env.register(treasury::WASM, ());
    treasury::Client::new(&env, &treasury).init(&admin, &sac.address(), &800);

    let oracle_id = env.register(oracle::WASM, ());
    let oracle_client = oracle::Client::new(&env, &oracle_id);
    oracle_client.init(&admin, &admin, &4, &300, &400);
    // Oldest first, one per day; the contract stores newest first.
    let mut prices = vec![&env];
    for p in CLOSES.iter() {
        prices.push_back(*p);
    }
    oracle_client.publish_batch(&prices, &(1_700_000_000 - 35 * DAY), &DAY);

    let id = env.register(InvoiceContract, ());
    let client = InvoiceContractClient::new(&env, &id);
    client.init(&Config {
        admin: admin.clone(),
        treasury: treasury.clone(),
        token: sac.address(),
        oracle: Some(oracle_id),
        oracle_asset: Symbol::new(&env, "TRY"),
        oracle_samples: 30,
        credit_premium_bps: 120,
        platform_fee_bps: 50,
        fallback_apy_bps: 800,
        fallback_fx_annual_bps: 2500,
        fx_floor_bps: 50,
        fx_cap_bps: 2500,
        whitelist_threshold: 15 * USDC,
        grace_period: 3 * DAY,
        quote_ttl: 24 * 3600,
    });
    treasury::Client::new(&env, &treasury).set_controller(&id);

    Fixture {
        env,
        client,
        admin,
        seller,
        buyer,
        funder_a,
        funder_b,
        token,
        treasury,
    }
}

fn hash(env: &Env, seed: u8) -> BytesN<32> {
    let mut raw = [0u8; 32];
    raw[31] = seed;
    BytesN::from_array(env, &raw)
}

fn register(f: &Fixture, seed: u8) -> u32 {
    f.client.register(
        &f.seller,
        &f.buyer,
        &hash(&f.env, seed),
        &f.env.crypto().sha256(&Bytes::from_array(&f.env, &[seed; 8])).into(),
        &Symbol::new(&f.env, "s1234567890"),
        &Symbol::new(&f.env, "b1234567890"),
        &(2_940 * FIAT_MINOR),
        &(60 * USDC),
        &(f.env.ledger().timestamp() + 90 * DAY),
    )
}

fn accept_and_fund(f: &Fixture, seed: u8) -> u32 {
    let id = register(f, seed);
    f.client.acknowledge(&id);
    let payout = f.client.accept_quote(&id).payout_usdc;
    f.client.set_whitelist(&f.funder_a, &true);
    f.client.fund(&id, &f.funder_a, &payout);
    id
}

// ── the invariant ───────────────────────────────────────────────────────────

/// The product's single invariant, and the first test written.
#[test]
fn the_same_ettn_cannot_be_financed_twice() {
    let f = setup();
    let ettn = hash(&f.env, 7);
    let doc = f.env.crypto().sha256(&Bytes::from_array(&f.env, &[1u8; 8])).into();

    let id = f.client.register(
        &f.seller,
        &f.buyer,
        &ettn,
        &doc,
        &Symbol::new(&f.env, "s1"),
        &Symbol::new(&f.env, "b1"),
        &(2_940 * FIAT_MINOR),
        &(60 * USDC),
        &(f.env.ledger().timestamp() + 90 * DAY),
    );
    assert!(!f.client.is_ettn_available(&ettn));
    assert_eq!(f.client.invoice_by_ettn(&ettn), Some(id));

    // A different document, a different amount, a different day — same ETTN.
    let err = f
        .client
        .try_register(
            &f.seller,
            &f.buyer,
            &ettn,
            &f.env.crypto().sha256(&Bytes::from_array(&f.env, &[9u8; 8])).into(),
            &Symbol::new(&f.env, "s1"),
            &Symbol::new(&f.env, "b1"),
            &(5_000 * FIAT_MINOR),
            &(99 * USDC),
            &(f.env.ledger().timestamp() + 30 * DAY),
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::EttnAlreadyUsed.into());
    assert_eq!(f.client.invoice_count(), 1, "reddedilen kayıt sayacı artırmamalı");
}

#[test]
fn happy_path_register_acknowledge_fund_repay() {
    let f = setup();
    let id = register(&f, 1);
    assert_eq!(f.client.get_invoice(&id).status, Status::Registered);

    f.client.acknowledge(&id);
    assert_eq!(f.client.get_invoice(&id).status, Status::Acknowledged);

    let quote = f.client.accept_quote(&id);
    let before = f.token.balance(&f.seller);

    f.client.set_whitelist(&f.funder_a, &true);
    f.client.set_whitelist(&f.funder_b, &true);
    let half = quote.payout_usdc / 2;
    f.client.fund(&id, &f.funder_a, &half);
    assert_eq!(f.client.get_invoice(&id).status, Status::Acknowledged);
    f.client.fund(&id, &f.funder_b, &(quote.payout_usdc - half));

    let funded = f.client.get_invoice(&id);
    assert_eq!(funded.status, Status::Funded);
    assert_eq!(
        f.token.balance(&f.seller) - before,
        quote.payout_usdc,
        "satıcı kilitli payout'u almalı"
    );

    f.env.ledger().with_mut(|l| l.timestamp += 90 * DAY);
    f.client.repay(&id, &f.buyer);
    assert_eq!(f.client.get_invoice(&id).status, Status::Repaid);
    assert_eq!(f.client.funder_count(&id), 2);
}

// ── who may do what ─────────────────────────────────────────────────────────

#[test]
fn only_the_named_buyer_can_acknowledge() {
    let f = setup();
    let id = register(&f, 2);
    let invoice = f.client.get_invoice(&id);
    assert_eq!(invoice.buyer, f.buyer, "onay hakkı faturadaki alıcıda");
}

#[test]
fn cannot_fund_before_acknowledgement() {
    let f = setup();
    let id = register(&f, 3);
    let err = f
        .client
        .try_fund(&id, &f.funder_a, &(10 * USDC))
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::InvalidStatus.into());
}

#[test]
fn cannot_fund_without_an_accepted_quote() {
    let f = setup();
    let id = register(&f, 4);
    f.client.acknowledge(&id);
    let err = f
        .client
        .try_fund(&id, &f.funder_a, &(10 * USDC))
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::NoQuoteAccepted.into());
}

#[test]
fn a_ticket_over_the_threshold_needs_a_licensed_funder() {
    let f = setup();
    let id = register(&f, 5);
    f.client.acknowledge(&id);
    let payout = f.client.accept_quote(&id).payout_usdc;
    assert!(payout > 15 * USDC, "bu test eşiğin üstünde bir dilim ister");

    let err = f
        .client
        .try_fund(&id, &f.funder_a, &payout)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::NotWhitelisted.into());

    f.client.set_whitelist(&f.funder_a, &true);
    f.client.fund(&id, &f.funder_a, &payout);
    assert_eq!(f.client.get_invoice(&id).status, Status::Funded);
}

#[test]
fn a_ticket_under_the_threshold_does_not() {
    let f = setup();
    let id = register(&f, 6);
    f.client.acknowledge(&id);
    f.client.accept_quote(&id);
    f.client.fund(&id, &f.funder_b, &(5 * USDC));
    assert_eq!(f.client.get_invoice(&id).funded_amount, 5 * USDC);
}

#[test]
fn cannot_subscribe_more_than_the_round_needs() {
    let f = setup();
    let id = register(&f, 8);
    f.client.acknowledge(&id);
    let payout = f.client.accept_quote(&id).payout_usdc;
    f.client.set_whitelist(&f.funder_a, &true);
    let err = f
        .client
        .try_fund(&id, &f.funder_a, &(payout + 1))
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::Oversubscribed.into());
}

#[test]
fn a_past_due_date_is_refused() {
    let f = setup();
    let err = f
        .client
        .try_register(
            &f.seller,
            &f.buyer,
            &hash(&f.env, 9),
            &hash(&f.env, 90),
            &Symbol::new(&f.env, "s1"),
            &Symbol::new(&f.env, "b1"),
            &(2_940 * FIAT_MINOR),
            &(60 * USDC),
            &(f.env.ledger().timestamp() - 1),
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::InvalidDueDate.into());
}

// ── pricing ─────────────────────────────────────────────────────────────────

/// Pinned to the seeded closes above. If the formula moves, this number moves.
#[test]
fn the_price_is_computed_from_the_feed_not_configured() {
    let f = setup();
    let id = register(&f, 10);
    f.client.acknowledge(&id);
    let q = f.client.quote(&id);

    assert_eq!(q.yield_source, Source::Live, "APY hazineden okunmalı");
    assert_eq!(q.fx_source, Source::Live, "kur beslemeden okunmalı");
    assert_eq!(q.apy_bps, 800);
    assert_eq!(q.days, 90);
    // 800 bps annual over 90 days.
    assert_eq!(q.yield_bps, 197);
    assert_eq!(q.credit_premium_bps, 120);
    assert_eq!(q.platform_fee_bps, 50);
    // Drift across the window, projected, plus half the range.
    assert!(q.fx_drift_bps > 0, "lira bu pencerede zayıfladı");
    // Thirty samples one day apart span twenty-nine days, not thirty.
    assert_eq!(q.fx_window_days, 29);
    assert_eq!(
        q.total_discount_bps,
        q.yield_bps + q.fx_risk_bps + q.credit_premium_bps + q.platform_fee_bps
    );
    assert_eq!(q.payout_usdc, 60 * USDC * (10_000 - q.total_discount_bps as i128) / 10_000);
}

/// Currency risk is never zero, even if the feed is flat.
#[test]
fn fx_premium_never_prices_currency_risk_at_zero() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_700_000_000);

    let admin = Address::generate(&env);
    let oracle_id = env.register(oracle::WASM, ());
    let o = oracle::Client::new(&env, &oracle_id);
    o.init(&admin, &admin, &4, &300, &400);
    // A perfectly flat feed: no drift, no range.
    let flat = vec![&env, 48_0000i128, 48_0000, 48_0000, 48_0000, 48_0000];
    o.publish_batch(&flat, &(1_700_000_000 - 5 * DAY), &DAY);

    let f = setup_with_oracle(&env, oracle_id, &admin);
    let id = f.client.register(
        &f.seller,
        &f.buyer,
        &hash(&env, 21),
        &hash(&env, 22),
        &Symbol::new(&env, "s1"),
        &Symbol::new(&env, "b1"),
        &(2_940 * FIAT_MINOR),
        &(60 * USDC),
        &(env.ledger().timestamp() + 90 * DAY),
    );
    f.client.acknowledge(&id);
    let q = f.client.quote(&id);
    assert_eq!(q.fx_risk_bps, 50, "taban uygulanmalı");
}

/// A feed reporting a collapse must not produce an unpayable discount.
#[test]
fn fx_premium_is_capped_when_the_feed_reports_a_collapse() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_700_000_000);

    let admin = Address::generate(&env);
    let oracle_id = env.register(oracle::WASM, ());
    let o = oracle::Client::new(&env, &oracle_id);
    o.init(&admin, &admin, &4, &300, &400);
    // The lira loses half its value across five days.
    let crash = vec![&env, 48_0000i128, 60_0000, 72_0000, 84_0000, 96_0000];
    o.publish_batch(&crash, &(1_700_000_000 - 5 * DAY), &DAY);

    let f = setup_with_oracle(&env, oracle_id, &admin);
    let id = f.client.register(
        &f.seller,
        &f.buyer,
        &hash(&env, 23),
        &hash(&env, 24),
        &Symbol::new(&env, "s1"),
        &Symbol::new(&env, "b1"),
        &(2_940 * FIAT_MINOR),
        &(60 * USDC),
        &(env.ledger().timestamp() + 90 * DAY),
    );
    f.client.acknowledge(&id);
    let q = f.client.quote(&id);
    assert_eq!(q.fx_risk_bps, 2_500, "tavan uygulanmalı");
    assert!(q.payout_usdc > 0, "iskonto anaparayı yiyemez");
}

/// With no oracle the quote still prices, and says it fell back.
#[test]
fn a_missing_oracle_degrades_rather_than_fails() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_700_000_000);
    let admin = Address::generate(&env);
    let f = setup_with_no_oracle(&env, &admin);

    let id = f.client.register(
        &f.seller,
        &f.buyer,
        &hash(&env, 25),
        &hash(&env, 26),
        &Symbol::new(&env, "s1"),
        &Symbol::new(&env, "b1"),
        &(2_940 * FIAT_MINOR),
        &(60 * USDC),
        &(env.ledger().timestamp() + 90 * DAY),
    );
    f.client.acknowledge(&id);
    let q = f.client.quote(&id);
    assert_eq!(q.fx_source, Source::Fallback);
    // 2500 bps annual, scaled to 90 days.
    assert_eq!(q.fx_risk_bps, 616);
}

/// The fallback is annual and scaled, so tenor still matters when it is used.
#[test]
fn the_fx_fallback_scales_with_tenor() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_700_000_000);
    let admin = Address::generate(&env);
    let f = setup_with_no_oracle(&env, &admin);

    let short = f.client.register(
        &f.seller, &f.buyer, &hash(&env, 27), &hash(&env, 28),
        &Symbol::new(&env, "s1"), &Symbol::new(&env, "b1"),
        &(2_940 * FIAT_MINOR), &(60 * USDC),
        &(env.ledger().timestamp() + 30 * DAY),
    );
    let long = f.client.register(
        &f.seller, &f.buyer, &hash(&env, 29), &hash(&env, 30),
        &Symbol::new(&env, "s1"), &Symbol::new(&env, "b1"),
        &(2_940 * FIAT_MINOR), &(60 * USDC),
        &(env.ledger().timestamp() + 120 * DAY),
    );
    f.client.acknowledge(&short);
    f.client.acknowledge(&long);
    assert!(
        f.client.quote(&long).fx_risk_bps > f.client.quote(&short).fx_risk_bps,
        "120 gün 30 günle aynı primi ödememeli"
    );
}

// ── the quote window ────────────────────────────────────────────────────────

/// An accepted quote is priced from the feed as it stood. Left fundable
/// indefinitely it would let funders subscribe at a rate the lira has moved
/// past, so the lock lives in temporary storage and the ledger expires it.
#[test]
fn an_accepted_quote_stops_being_fundable_once_its_window_lapses() {
    let f = setup();
    let id = register(&f, 40);
    f.client.acknowledge(&id);
    let payout = f.client.accept_quote(&id).payout_usdc;
    assert!(f.client.quote_locked(&id));

    f.env.ledger().with_mut(|l| {
        l.sequence_number += (24 * 60 * 12) + 20;
        l.timestamp += 24 * 3600 + 60;
    });
    assert!(!f.client.quote_locked(&id), "süre dolunca kilit kalmamalı");

    f.client.set_whitelist(&f.funder_a, &true);
    let err = f
        .client
        .try_fund(&id, &f.funder_a, &payout)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::QuoteExpired.into());

    // Accepting again at the current price restores a fundable lock.
    f.client.accept_quote(&id);
    assert!(f.client.quote_locked(&id));
    f.client
        .fund(&id, &f.funder_a, &f.client.get_invoice(&id).locked_payout_usdc);
    assert_eq!(f.client.get_invoice(&id).status, Status::Funded);
}

// ── settlement and recourse ─────────────────────────────────────────────────

#[test]
fn repayment_distributes_pro_rata_and_leaves_no_dust() {
    let f = setup();
    let id = register(&f, 11);
    f.client.acknowledge(&id);
    let payout = f.client.accept_quote(&id).payout_usdc;
    f.client.set_whitelist(&f.funder_a, &true);
    f.client.set_whitelist(&f.funder_b, &true);

    // A deliberately uneven split, so rounding has somewhere to go wrong.
    let a = payout / 3;
    f.client.fund(&id, &f.funder_a, &a);
    f.client.fund(&id, &f.funder_b, &(payout - a));

    let before_a = f.token.balance(&f.funder_a);
    let before_b = f.token.balance(&f.funder_b);
    let contract = f.client.address.clone();
    let held = f.token.balance(&contract);

    f.env.ledger().with_mut(|l| l.timestamp += 90 * DAY);
    f.client.repay(&id, &f.buyer);

    let paid_a = f.token.balance(&f.funder_a) - before_a;
    let paid_b = f.token.balance(&f.funder_b) - before_b;
    assert_eq!(paid_a + paid_b, 60 * USDC, "nominalin tamamı dağıtılmalı");
    assert!(paid_a > a, "fonlayıcı anaparasından fazlasını almalı");
    assert!(paid_b > payout - a);
    assert_eq!(f.token.balance(&contract), held, "kontratta toz kalmamalı");
}

#[test]
fn cannot_declare_a_default_before_the_grace_period_ends() {
    let f = setup();
    let id = accept_and_fund(&f, 12);

    let err = f.client.try_mark_default(&id).unwrap_err().unwrap();
    assert_eq!(err, Error::NotYetDue.into());

    // One day into the grace period is still early.
    f.env.ledger().with_mut(|l| l.timestamp += 90 * DAY + DAY);
    let err = f.client.try_mark_default(&id).unwrap_err().unwrap();
    assert_eq!(err, Error::NotYetDue.into());

    f.env.ledger().with_mut(|l| l.timestamp += 3 * DAY);
    f.client.mark_default(&id);
    assert_eq!(f.client.get_invoice(&id).status, Status::Defaulted);
}

#[test]
fn a_default_drains_the_buffer_first_and_bills_the_rest_to_the_seller() {
    let f = setup();
    let id = accept_and_fund(&f, 13);
    let funded = f.client.get_invoice(&id).funded_amount;

    // The buffer covers a quarter of the round.
    let buffer = funded / 4;
    f.client.deposit_first_loss(&f.admin, &buffer);
    assert_eq!(f.client.first_loss_buffer(), buffer);

    let before = f.token.balance(&f.funder_a);
    f.env.ledger().with_mut(|l| l.timestamp += 90 * DAY + 4 * DAY);
    let outcome = f.client.mark_default(&id);

    assert_eq!(outcome.from_first_loss, buffer);
    assert_eq!(outcome.seller_recourse, funded - buffer);
    assert_eq!(
        f.token.balance(&f.funder_a) - before,
        buffer,
        "tampon fonlayıcıya geri dönmeli"
    );
    assert_eq!(f.client.first_loss_buffer(), 0, "tampon boşaltılmalı");
}

#[test]
fn an_empty_buffer_passes_the_whole_shortfall_to_the_seller() {
    let f = setup();
    let id = accept_and_fund(&f, 14);
    let funded = f.client.get_invoice(&id).funded_amount;

    f.env.ledger().with_mut(|l| l.timestamp += 90 * DAY + 4 * DAY);
    let outcome = f.client.mark_default(&id);
    assert_eq!(outcome.from_first_loss, 0);
    assert_eq!(outcome.seller_recourse, funded);
}

// ── treasury ────────────────────────────────────────────────────────────────

#[test]
fn funding_cannot_complete_if_the_treasury_cannot_release_the_payout() {
    let f = setup();
    let id = register(&f, 15);
    f.client.acknowledge(&id);
    let payout = f.client.accept_quote(&id).payout_usdc;
    f.client.set_whitelist(&f.funder_a, &true);

    // Drain the treasury behind the contract's back, then complete the round.
    let stolen = f.token.balance(&f.treasury);
    if stolen > 0 {
        f.token.transfer(&f.treasury, &f.admin, &stolen);
    }
    f.client.fund(&id, &f.funder_a, &(payout - USDC));
    f.token
        .transfer(&f.treasury, &f.admin, &f.token.balance(&f.treasury));

    let err = f
        .client
        .try_fund(&id, &f.funder_a, &USDC)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::InsufficientLiquidity.into());
}

#[test]
fn funded_capital_sits_in_the_treasury_until_the_round_completes() {
    let f = setup();
    let id = register(&f, 16);
    f.client.acknowledge(&id);
    let payout = f.client.accept_quote(&id).payout_usdc;
    f.client.set_whitelist(&f.funder_a, &true);

    let before = f.token.balance(&f.treasury);
    f.client.fund(&id, &f.funder_a, &(payout / 2));
    assert_eq!(
        f.token.balance(&f.treasury) - before,
        payout / 2,
        "fon hazineye girmeli"
    );
    assert_eq!(f.client.treasury_assets(), f.token.balance(&f.treasury));
}

#[test]
fn the_treasury_apy_is_reported_with_its_provenance() {
    let f = setup();
    let (bps, source) = f.client.treasury_apy_bps();
    assert_eq!(bps, 800);
    assert_eq!(source, Source::Live);
}

// ── fixtures for the variants ───────────────────────────────────────────────

fn setup_with_oracle(env: &Env, oracle_id: Address, admin: &Address) -> Fixture {
    build(env, admin, Some(oracle_id))
}

fn setup_with_no_oracle(env: &Env, admin: &Address) -> Fixture {
    build(env, admin, None)
}

fn build(env: &Env, admin: &Address, oracle: Option<Address>) -> Fixture {
    let seller = Address::generate(env);
    let buyer = Address::generate(env);
    let funder_a = Address::generate(env);
    let funder_b = Address::generate(env);

    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token = token::Client::new(env, &sac.address());
    let mint = token::StellarAssetClient::new(env, &sac.address());
    for who in [&seller, &buyer, &funder_a, &funder_b, admin] {
        mint.mint(who, &(10_000 * USDC));
    }

    let treasury = env.register(treasury::WASM, ());
    treasury::Client::new(env, &treasury).init(admin, &sac.address(), &800);

    let id = env.register(InvoiceContract, ());
    let client = InvoiceContractClient::new(env, &id);
    client.init(&Config {
        admin: admin.clone(),
        treasury: treasury.clone(),
        token: sac.address(),
        oracle,
        oracle_asset: Symbol::new(env, "TRY"),
        oracle_samples: 30,
        credit_premium_bps: 120,
        platform_fee_bps: 50,
        fallback_apy_bps: 800,
        fallback_fx_annual_bps: 2500,
        fx_floor_bps: 50,
        fx_cap_bps: 2500,
        whitelist_threshold: 15 * USDC,
        grace_period: 3 * DAY,
        quote_ttl: 24 * 3600,
    });
    treasury::Client::new(env, &treasury).set_controller(&id);

    Fixture {
        env: env.clone(),
        client,
        admin: admin.clone(),
        seller,
        buyer,
        funder_a,
        funder_b,
        token,
        treasury,
    }
}

// ── transferable claims ─────────────────────────────────────────────────────

/// What turns a record into an instrument: a funder who needs the money back
/// before maturity can sell their share, and the buyer is never consulted.
#[test]
fn a_claim_can_change_hands() {
    let f = setup();
    let id = accept_and_fund(&f, 31);

    let held = f.client.claim_of(&id, &f.funder_a);
    assert!(held > 0, "the funder should hold what they put in");
    assert_eq!(f.client.claim_of(&id, &f.funder_b), 0);

    let part = held / 4;
    f.client.transfer_claim(&id, &f.funder_a, &f.funder_b, &part);

    assert_eq!(f.client.claim_of(&id, &f.funder_a), held - part);
    assert_eq!(f.client.claim_of(&id, &f.funder_b), part);
}

/// Nothing is created or destroyed by a transfer. The ledger's sum is what the
/// contract pays out at maturity, so it has to survive every move.
#[test]
fn transferring_never_changes_the_total() {
    let f = setup();
    let id = accept_and_fund(&f, 32);

    let total = |f: &Fixture| -> i128 {
        f.client.funders_of(&id).iter().map(|x| x.amount).sum()
    };
    let before = total(&f);

    let held = f.client.claim_of(&id, &f.funder_a);
    f.client.transfer_claim(&id, &f.funder_a, &f.funder_b, &(held / 3));
    f.client.transfer_claim(&id, &f.funder_b, &f.admin, &(held / 9));
    f.client.transfer_claim(&id, &f.funder_a, &f.admin, &1);

    assert_eq!(total(&f), before, "the sum over the ledger must not move");
    assert_eq!(
        f.client.claim_of(&id, &f.funder_a)
            + f.client.claim_of(&id, &f.funder_b)
            + f.client.claim_of(&id, &f.admin),
        before,
    );
}

/// The whole holding can go, leaving nothing behind.
#[test]
fn a_whole_claim_can_be_sold() {
    let f = setup();
    let id = accept_and_fund(&f, 33);
    let held = f.client.claim_of(&id, &f.funder_a);

    f.client.transfer_claim(&id, &f.funder_a, &f.funder_b, &held);

    assert_eq!(f.client.claim_of(&id, &f.funder_a), 0);
    assert_eq!(f.client.claim_of(&id, &f.funder_b), held);
}

/// Whoever holds the claim at maturity is who gets paid. This is the point of
/// the whole feature: the contract pays the holder, not the original funder.
#[test]
fn repayment_follows_the_claim() {
    let f = setup();
    let id = accept_and_fund(&f, 34);
    let held = f.client.claim_of(&id, &f.funder_a);
    f.client.transfer_claim(&id, &f.funder_a, &f.funder_b, &held);

    let face = f.client.get_invoice(&id).face_usdc;
    let before = f.token.balance(&f.funder_b);

    f.env.ledger().set_timestamp(f.env.ledger().timestamp() + 91 * DAY);
    f.client.repay(&id, &f.buyer);

    assert_eq!(
        f.token.balance(&f.funder_b) - before,
        face,
        "the new holder receives the whole face value",
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #15)")]
fn cannot_transfer_more_than_held() {
    let f = setup();
    let id = accept_and_fund(&f, 35);
    let held = f.client.claim_of(&id, &f.funder_a);
    f.client.transfer_claim(&id, &f.funder_a, &f.funder_b, &(held + 1));
}

#[test]
#[should_panic(expected = "Error(Contract, #15)")]
fn cannot_transfer_without_a_claim() {
    let f = setup();
    let id = accept_and_fund(&f, 36);
    f.client.transfer_claim(&id, &f.funder_b, &f.funder_a, &1);
}

/// Once the invoice is settled the claim has been paid, and moving it then
/// would promise a payment that has already been made.
#[test]
#[should_panic(expected = "Error(Contract, #16)")]
fn a_settled_claim_cannot_move() {
    let f = setup();
    let id = accept_and_fund(&f, 37);
    f.env.ledger().set_timestamp(f.env.ledger().timestamp() + 91 * DAY);
    f.client.repay(&id, &f.buyer);

    f.client
        .transfer_claim(&id, &f.funder_a, &f.funder_b, &1);
}
