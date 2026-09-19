use soroban_sdk::{contractevent, Address, BytesN};

#[contractevent]
pub struct Registered {
    pub invoice_id: u32,
    pub seller: Address,
    pub ettn_hash: BytesN<32>,
}

#[contractevent]
pub struct Acknowledged {
    pub invoice_id: u32,
    pub buyer: Address,
}

#[contractevent]
pub struct Quoted {
    pub invoice_id: u32,
    pub total_discount_bps: u32,
    pub payout_usdc: i128,
}

#[contractevent]
pub struct Funded {
    pub invoice_id: u32,
    pub funder: Address,
    pub amount: i128,
}

#[contractevent]
pub struct Settled {
    pub invoice_id: u32,
    pub paid: i128,
}

#[contractevent]
pub struct Defaulted {
    pub invoice_id: u32,
    pub from_first_loss: i128,
    pub seller_recourse: i128,
}

#[contractevent]
pub struct WhitelistChanged {
    pub funder: Address,
    pub allowed: bool,
}

/// A funder's claim changed hands before maturity.
#[contractevent]
pub struct ClaimMoved {
    pub invoice_id: u32,
    pub from: Address,
    pub to: Address,
    pub amount: i128,
}
