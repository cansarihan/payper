#![no_std]
//! Receivable financing: register, acknowledge, price, fund, settle.
//!
//! Invariant: one ETTN, one financing. The hash is stored under
//! [`DataKey::Ettn`] and checked before any write.
//!
//! Two of the discount's four components are read from chain per call; the
//! quote records which were live. See [`pricing`].

mod events;
mod pricing;
mod types;

#[cfg(test)]
mod test;

use soroban_sdk::{
    auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation},
    contract, contractimpl, panic_with_error, symbol_short, token, vec, Address, BytesN, Env,
    IntoVal, Symbol, Vec,
};

use events::{Acknowledged, Defaulted, Funded, Quoted, Registered, Settled, WhitelistChanged};
pub use types::*;

const DAY: u64 = 86_400;
/// Ledgers close roughly every five seconds on both networks.
const LEDGERS_PER_MINUTE: u64 = 12;
/// The network's maximum entry lifetime.
const MAX_TTL: u32 = 3_110_400;

#[contract]
pub struct InvoiceContract;

#[contractimpl]
impl InvoiceContract {
    pub fn init(env: Env, config: Config) {
        if env.storage().instance().has(&DataKey::Config) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        config.admin.require_auth();
        env.storage().instance().set(&DataKey::Config, &config);
        env.storage().instance().set(&DataKey::NextId, &1u32);
    }

    pub fn set_config(env: Env, config: Config) {
        let current = load_config(&env);
        current.admin.require_auth();
        env.storage().instance().set(&DataKey::Config, &config);
    }

    pub fn config(env: Env) -> Config {
        load_config(&env)
    }

    // ── Registration ────────────────────────────────────────────────────────

    /// Register a term e-invoice. Refuses a previously financed ETTN.
    ///
    /// `doc_hash` pins the financed bytes for later signature verification.
    #[allow(clippy::too_many_arguments)]
    pub fn register(
        env: Env,
        seller: Address,
        buyer: Address,
        ettn_hash: BytesN<32>,
        doc_hash: BytesN<32>,
        seller_tax_id: Symbol,
        buyer_tax_id: Symbol,
        amount_fiat: i128,
        face_usdc: i128,
        due_date: u64,
    ) -> u32 {
        seller.require_auth();

        // Before any write.
        if env
            .storage()
            .persistent()
            .has(&DataKey::Ettn(ettn_hash.clone()))
        {
            panic_with_error!(&env, Error::EttnAlreadyUsed);
        }
        if amount_fiat <= 0 || face_usdc <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        if due_date <= env.ledger().timestamp() {
            panic_with_error!(&env, Error::InvalidDueDate);
        }

        let id: u32 = env.storage().instance().get(&DataKey::NextId).unwrap_or(1);
        env.storage().instance().set(&DataKey::NextId, &(id + 1));

        let invoice = Invoice {
            id,
            seller: seller.clone(),
            buyer,
            ettn_hash: ettn_hash.clone(),
            doc_hash,
            seller_tax_id,
            buyer_tax_id,
            amount_fiat,
            face_usdc,
            due_date,
            status: Status::Registered,
            funded_amount: 0,
            locked_discount_bps: 0,
            locked_payout_usdc: 0,
            created_at: env.ledger().timestamp(),
        };
        put_invoice(&env, &invoice);

        env.storage()
            .persistent()
            .set(&DataKey::Ettn(ettn_hash.clone()), &id);
        // Carries the uniqueness guarantee; must not drift toward archival.
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Ettn(ettn_hash.clone()), MAX_TTL - 1, MAX_TTL);

        Registered {
            invoice_id: id,
            seller,
            ettn_hash,
        }
        .publish(&env);
        id
    }

    pub fn is_ettn_available(env: Env, ettn_hash: BytesN<32>) -> bool {
        !env.storage().persistent().has(&DataKey::Ettn(ettn_hash))
    }

    pub fn invoice_by_ettn(env: Env, ettn_hash: BytesN<32>) -> Option<u32> {
        env.storage().persistent().get(&DataKey::Ettn(ettn_hash))
    }

    // ── Acknowledgement ─────────────────────────────────────────────────────

    /// Buyer confirms the receivable. Required before funding opens.
    ///
    /// Restricted to the address on the invoice.
    pub fn acknowledge(env: Env, invoice_id: u32) {
        let mut invoice = load_invoice(&env, invoice_id);
        invoice.buyer.require_auth();

        if invoice.status != Status::Registered {
            panic_with_error!(&env, Error::InvalidStatus);
        }
        invoice.status = Status::Acknowledged;
        let buyer = invoice.buyer.clone();
        put_invoice(&env, &invoice);

        Acknowledged { invoice_id, buyer }.publish(&env);
    }

    // ── Pricing ─────────────────────────────────────────────────────────────

    /// Live price. Read-only, safe to poll.
    pub fn quote(env: Env, invoice_id: u32) -> Quote {
        let cfg = load_config(&env);
        let invoice = load_invoice(&env, invoice_id);
        pricing::compute_quote(&env, &cfg, &invoice)
    }

    /// Seller accepts, fixing discount and payout.
    ///
    /// Funders subscribe against a fixed payout, so later oracle moves cannot
    /// change what is owed. The lock sits in temporary storage with `quote_ttl`
    /// as its TTL and expires without a sweep.
    pub fn accept_quote(env: Env, invoice_id: u32) -> Quote {
        let cfg = load_config(&env);
        let mut invoice = load_invoice(&env, invoice_id);
        invoice.seller.require_auth();

        if invoice.status != Status::Acknowledged {
            panic_with_error!(&env, Error::InvalidStatus);
        }

        let quote = pricing::compute_quote(&env, &cfg, &invoice);
        invoice.locked_discount_bps = quote.total_discount_bps;
        invoice.locked_payout_usdc = quote.payout_usdc;
        put_invoice(&env, &invoice);

        let ledgers = ttl_ledgers(cfg.quote_ttl);
        env.storage()
            .temporary()
            .set(&DataKey::QuoteLock(invoice_id), &env.ledger().timestamp());
        env.storage()
            .temporary()
            .extend_ttl(&DataKey::QuoteLock(invoice_id), ledgers, ledgers);

        Quoted {
            invoice_id,
            total_discount_bps: quote.total_discount_bps,
            payout_usdc: quote.payout_usdc,
        }
        .publish(&env);
        quote
    }

    /// Whether this invoice still has a fundable accepted quote.
    pub fn quote_locked(env: Env, invoice_id: u32) -> bool {
        env.storage()
            .temporary()
            .has(&DataKey::QuoteLock(invoice_id))
    }

    // ── Funding ─────────────────────────────────────────────────────────────

    /// Subscribe `amount` stroops of an acknowledged invoice's payout.
    ///
    /// Contributions sit in the treasury while the round fills; on completion
    /// the payout is drawn back out and paid to the seller.
    pub fn fund(env: Env, invoice_id: u32, funder: Address, amount: i128) {
        let cfg = load_config(&env);
        let mut invoice = load_invoice(&env, invoice_id);
        funder.require_auth();

        if invoice.status != Status::Acknowledged {
            panic_with_error!(&env, Error::InvalidStatus);
        }
        if invoice.locked_discount_bps == 0 {
            panic_with_error!(&env, Error::NoQuoteAccepted);
        }
        // No live lock: the accepted price has expired.
        if !env
            .storage()
            .temporary()
            .has(&DataKey::QuoteLock(invoice_id))
        {
            panic_with_error!(&env, Error::QuoteExpired);
        }
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let remaining = invoice.locked_payout_usdc - invoice.funded_amount;
        if amount > remaining {
            panic_with_error!(&env, Error::Oversubscribed);
        }
        if amount > cfg.whitelist_threshold && !is_whitelisted(&env, &funder) {
            panic_with_error!(&env, Error::NotWhitelisted);
        }

        // Signed by the funder at the root of the invocation.
        let treasury = TreasuryClient::new(&env, &cfg.treasury);
        treasury.deposit(&funder, &amount);

        invoice.funded_amount += amount;
        let mut ledger = funders_of(&env, invoice_id);
        ledger.push_back(Funding {
            funder: funder.clone(),
            amount,
            at: env.ledger().timestamp(),
        });
        env.storage()
            .persistent()
            .set(&DataKey::Funders(invoice_id), &ledger);

        Funded {
            invoice_id,
            funder,
            amount,
        }
        .publish(&env);

        if invoice.funded_amount >= invoice.locked_payout_usdc {
            let payout = invoice.locked_payout_usdc;
            if treasury.total_assets() < payout {
                panic_with_error!(&env, Error::InsufficientLiquidity);
            }
            // The treasury's transfer runs a frame deeper than the invoker's
            // signature reaches; authorize it explicitly.
            authorize_treasury_transfer(&env, &cfg, payout);
            treasury.withdraw(&env.current_contract_address(), &payout);

            token::Client::new(&env, &cfg.token).transfer(
                &env.current_contract_address(),
                &invoice.seller,
                &payout,
            );
            invoice.status = Status::Funded;
        }

        put_invoice(&env, &invoice);
    }

    pub fn funders_of(env: Env, invoice_id: u32) -> Vec<Funding> {
        funders_of(&env, invoice_id)
    }

    pub fn funder_count(env: Env, invoice_id: u32) -> u32 {
        funders_of(&env, invoice_id).len()
    }

    // ── Settlement ──────────────────────────────────────────────────────────

    /// Buyer pays face value at maturity; funders are repaid pro rata.
    pub fn repay(env: Env, invoice_id: u32, payer: Address) {
        let cfg = load_config(&env);
        let mut invoice = load_invoice(&env, invoice_id);
        payer.require_auth();

        if invoice.status != Status::Funded {
            panic_with_error!(&env, Error::InvalidStatus);
        }

        let token_client = token::Client::new(&env, &cfg.token);
        let face = invoice.face_usdc;
        token_client.transfer(&payer, &env.current_contract_address(), &face);

        let ledger = funders_of(&env, invoice_id);
        let subscribed = invoice.funded_amount;
        let mut distributed = 0i128;
        let last = ledger.len().saturating_sub(1);

        for (i, f) in ledger.iter().enumerate() {
            // Remainder to the last funder, so rounding leaves no dust.
            let share = if i as u32 == last {
                face - distributed
            } else {
                face * f.amount / subscribed
            };
            if share > 0 {
                token_client.transfer(&env.current_contract_address(), &f.funder, &share);
            }
            distributed += share;
        }

        invoice.status = Status::Repaid;
        put_invoice(&env, &invoice);

        Settled {
            invoice_id,
            paid: face,
        }
        .publish(&env);
    }

    // ── Default and recourse ────────────────────────────────────────────────

    /// Declare a default after due date plus grace period.
    ///
    /// Sold with recourse: the first-loss buffer is drained to funders first,
    /// the remainder recorded as a claim on the seller.
    pub fn mark_default(env: Env, invoice_id: u32) -> DefaultOutcome {
        let cfg = load_config(&env);
        let mut invoice = load_invoice(&env, invoice_id);
        cfg.admin.require_auth();

        if invoice.status != Status::Funded {
            panic_with_error!(&env, Error::InvalidStatus);
        }
        if env.ledger().timestamp() < invoice.due_date + cfg.grace_period {
            panic_with_error!(&env, Error::NotYetDue);
        }

        let buffer: i128 = env.storage().instance().get(&DataKey::FirstLoss).unwrap_or(0);
        let shortfall = invoice.funded_amount;
        let from_first_loss = if buffer >= shortfall { shortfall } else { buffer };
        let seller_recourse = shortfall - from_first_loss;

        if from_first_loss > 0 {
            let token_client = token::Client::new(&env, &cfg.token);
            let ledger = funders_of(&env, invoice_id);
            let mut distributed = 0i128;
            let last = ledger.len().saturating_sub(1);
            for (i, f) in ledger.iter().enumerate() {
                let share = if i as u32 == last {
                    from_first_loss - distributed
                } else {
                    from_first_loss * f.amount / shortfall
                };
                if share > 0 {
                    token_client.transfer(&env.current_contract_address(), &f.funder, &share);
                }
                distributed += share;
            }
            env.storage()
                .instance()
                .set(&DataKey::FirstLoss, &(buffer - from_first_loss));
        }

        invoice.status = Status::Defaulted;
        put_invoice(&env, &invoice);

        let outcome = DefaultOutcome {
            invoice_id,
            from_first_loss,
            seller_recourse,
        };
        Defaulted {
            invoice_id,
            from_first_loss,
            seller_recourse,
        }
        .publish(&env);
        outcome
    }

    /// Top up the first-loss buffer. Platform capital, not funder capital.
    pub fn deposit_first_loss(env: Env, from: Address, amount: i128) {
        let cfg = load_config(&env);
        from.require_auth();
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        token::Client::new(&env, &cfg.token).transfer(
            &from,
            &env.current_contract_address(),
            &amount,
        );
        let buffer: i128 = env.storage().instance().get(&DataKey::FirstLoss).unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::FirstLoss, &(buffer + amount));
    }

    pub fn first_loss_buffer(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::FirstLoss).unwrap_or(0)
    }

    // ── Whitelist ───────────────────────────────────────────────────────────

    pub fn set_whitelist(env: Env, funder: Address, allowed: bool) {
        let cfg = load_config(&env);
        cfg.admin.require_auth();
        if allowed {
            env.storage()
                .persistent()
                .set(&DataKey::Whitelist(funder.clone()), &true);
        } else {
            env.storage()
                .persistent()
                .remove(&DataKey::Whitelist(funder.clone()));
        }
        WhitelistChanged { funder, allowed }.publish(&env);
    }

    pub fn is_whitelisted(env: Env, funder: Address) -> bool {
        is_whitelisted(&env, &funder)
    }

    // ── Reads ───────────────────────────────────────────────────────────────

    pub fn get_invoice(env: Env, invoice_id: u32) -> Invoice {
        load_invoice(&env, invoice_id)
    }

    pub fn invoice_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(1u32)
            - 1
    }

    pub fn treasury_assets(env: Env) -> i128 {
        TreasuryClient::new(&env, &load_config(&env).treasury).total_assets()
    }

    /// Treasury APY with its provenance.
    pub fn treasury_apy_bps(env: Env) -> (u32, Source) {
        let cfg = load_config(&env);
        let client = TreasuryClient::new(&env, &cfg.treasury);
        match client.try_apy_bps() {
            Ok(Ok(bps)) => (bps, Source::Live),
            _ => (cfg.fallback_apy_bps, Source::Fallback),
        }
    }
}

// ── helpers ─────────────────────────────────────────────────────────────────

/// Authorize the treasury's token transfer for this payout.
///
/// Without it: `Error(Auth, InvalidAction)` — the funder's signature covers our
/// call, not the treasury's.
fn authorize_treasury_transfer(env: &Env, cfg: &Config, amount: i128) {
    env.authorize_as_current_contract(vec![
        env,
        InvokerContractAuthEntry::Contract(SubContractInvocation {
            context: ContractContext {
                contract: cfg.token.clone(),
                fn_name: symbol_short!("transfer"),
                args: (
                    cfg.treasury.clone(),
                    env.current_contract_address(),
                    amount,
                )
                    .into_val(env),
            },
            sub_invocations: vec![env],
        }),
    ]);
}

fn ttl_ledgers(seconds: u64) -> u32 {
    let ledgers = (seconds * LEDGERS_PER_MINUTE).div_ceil(60).max(1);
    ledgers.min(MAX_TTL as u64) as u32
}

fn load_config(env: &Env) -> Config {
    env.storage()
        .instance()
        .get(&DataKey::Config)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

fn load_invoice(env: &Env, id: u32) -> Invoice {
    env.storage()
        .persistent()
        .get(&DataKey::Invoice(id))
        .unwrap_or_else(|| panic_with_error!(env, Error::InvoiceNotFound))
}

fn put_invoice(env: &Env, invoice: &Invoice) {
    env.storage()
        .persistent()
        .set(&DataKey::Invoice(invoice.id), invoice);
}

fn funders_of(env: &Env, invoice_id: u32) -> Vec<Funding> {
    env.storage()
        .persistent()
        .get(&DataKey::Funders(invoice_id))
        .unwrap_or_else(|| vec![env])
}

fn is_whitelisted(env: &Env, funder: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Whitelist(funder.clone()))
        .unwrap_or(false)
}
