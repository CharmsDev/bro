use anyhow::ensure;
use bitcoin::consensus::encode::deserialize_hex;
use bitcoin::hashes::Hash;
use bitcoin::hex::DisplayHex;
use charms_sdk::data::{App, B32, Data, NFT, TOKEN, Transaction, TxId, charm_values};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub struct NftContent {
    pub name: String,
    pub description: String,
    pub ticker: String,
    pub url: String,
    pub image: String,
    pub supply_limit: u64,
    pub decimals: u8,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
pub struct PrivateInput {
    pub tx: String,
    pub tx_block_proof: String,
}

pub fn app_contract(app: &App, tx: &Transaction, x: &Data, w: &Data) -> bool {
    app_contract_impl(app, tx, x, w)
        .map_err(|e| eprintln!("{:?}", e))
        .is_ok()
}

pub fn app_contract_impl(app: &App, tx: &Transaction, x: &Data, w: &Data) -> anyhow::Result<()> {
    let empty = Data::empty();
    assert_eq!(x, &empty);
    match app.tag {
        NFT => nft_contract_satisfied(app, tx),
        TOKEN => token_contract_satisfied(app, tx, w),
        _ => {
            unreachable!("how did we even get here?")
        }
    }
}

fn nft_contract_satisfied(app: &App, tx: &Transaction) -> anyhow::Result<()> {
    can_mint_nft(app, tx)
}

fn can_mint_nft(nft_app: &App, tx: &Transaction) -> anyhow::Result<()> {
    // can only mint an NFT with this contract if the first (index 0) spent UTXO has
    // the same hash as app identity.
    let w_str: Option<String> = tx.ins.get(0).map(|(utxo_id, _)| utxo_id.to_string());

    ensure!(w_str.is_some());
    let w_str = w_str.unwrap();

    // can only mint an NFT with this contract if the hash of `w` is the identity of the NFT.
    ensure!(hash(&w_str) == nft_app.identity);

    let nft_charms = charm_values(nft_app, tx.outs.iter()).collect::<Vec<_>>();

    // can mint exactly one NFT.
    ensure!(nft_charms.len() == 1);

    // the NFT has the correct structure.
    let _ = nft_charms[0].value::<NftContent>()?;

    Ok(())
}

pub(crate) fn hash(data: &str) -> B32 {
    let hash = Sha256::digest(data);
    B32(hash.into())
}

pub fn double_sha256(data: &[u8]) -> Vec<u8> {
    let hash = Sha256::digest(data);
    let hash = Sha256::digest(&hash);
    hash.to_vec()
}

pub fn count_leading_zero_bits(data: &[u8]) -> usize {
    match data
        .iter()
        .enumerate()
        .skip_while(|(_, b)| **b == 0u8)
        .next()
    {
        Some((i, b)) => i * 8 + b.leading_zeros() as usize,
        None => data.len() * 8,
    }
}

fn token_contract_satisfied(token_app: &App, tx: &Transaction, w: &Data) -> anyhow::Result<()> {
    can_mint_token(token_app, tx, w)
}

fn can_mint_token(token_app: &App, tx: &Transaction, w: &Data) -> anyhow::Result<()> {
    let w: PrivateInput = w.value()?;
    let mining_tx: bitcoin::Transaction = deserialize_hex(&w.tx)?;
    let tx_id = tx.ins[0].0.0;
    let mining_txid = mining_tx.compute_txid();
    ensure!(tx_id == TxId(mining_txid.to_byte_array()));

    let tx_block_proof: bitcoin::merkle_tree::MerkleBlock = deserialize_hex(&w.tx_block_proof)?;

    let block_time = tx_block_proof.header.time;
    eprintln!("block time: {}", block_time);

    // verify tx_block_proof
    let mut txs = vec![];
    {
        let mut _indexes = vec![];
        tx_block_proof.extract_matches(&mut txs, &mut _indexes)?;
    }
    ensure!(txs.first() == Some(&mining_txid));

    let op_return_output = mining_tx.output.first();
    ensure!(op_return_output.is_some());
    let op_return_output = op_return_output.unwrap();

    ensure!(op_return_output.script_pubkey.is_op_return());
    let bytes = op_return_output.script_pubkey.to_bytes();
    ensure!(bytes.len() == bytes[1] as usize + 2);
    let bytes = &bytes[2..];
    let nonce = String::from_utf8(bytes.to_vec()).unwrap();

    let challenge_txid = mining_tx.input[0].previous_output.txid.to_string();
    let challenge_vout = mining_tx.input[0].previous_output.vout;
    let hash_input = format!("{}:{}{}", challenge_txid, challenge_vout, nonce);

    dbg!(&hash_input);

    let hash_bytes = double_sha256(hash_input.as_bytes());
    dbg!(hash_bytes.as_hex());
    let clz = count_leading_zero_bits(&hash_bytes);
    dbg!(clz);

    let expected_amount: u64 = mined_amount(block_time as u64, clz);

    let minted_amount = tx
        .outs
        .first()
        .and_then(|charms| charms.get(token_app))
        .map(|v| v.value::<u64>())
        .transpose()?;
    ensure!(minted_amount == Some(expected_amount));

    Ok(())
}

const TOTAL_LIMIT: u64 = 69_420_000_000;
const MAX_MINTS_PER_BLOCK: u64 = 3200;
const HALVING_PERIOD_DAYS: u64 = 14;
const BLOCKS_PER_PERIOD: u64 = HALVING_PERIOD_DAYS * 24 * 6;
const SECONDS_PER_PERIOD: u64 = HALVING_PERIOD_DAYS * 24 * 60 * 60;
const CLZ_FACTOR_DENOMINATOR: u64 = 4500;

// uncomment to launch at 00:00 UTC on Aug 14, 2025.
// const START_TIME: u32 = 1_755_129_600;

// 7/26/2025 20:00:00 UTC
const START_TIME: u64 = 1_753_560_000;

const CONST_FACTOR: f64 = TOTAL_LIMIT as f64
    / (MAX_MINTS_PER_BLOCK * 2 * BLOCKS_PER_PERIOD * SECONDS_PER_PERIOD) as f64
    / CLZ_FACTOR_DENOMINATOR as f64;

fn mined_amount(block_time: u64, clz: usize) -> u64 {
    (CONST_FACTOR / 2u64.pow(((block_time - START_TIME) / SECONDS_PER_PERIOD) as u32) as f64
        * clz.pow(2) as f64) as u64
}

#[cfg(test)]
mod test {
    use super::*;
    use charms_sdk::data::UtxoId;

    #[test]
    fn dummy() {}

    #[test]
    fn test_hash() {
        let utxo_id =
            UtxoId::from_str("dc78b09d767c8565c4a58a95e7ad5ee22b28fc1685535056a395dc94929cdd5f:1")
                .unwrap();
        let data = dbg!(utxo_id.to_string());
        let expected = "f54f6d40bd4ba808b188963ae5d72769ad5212dd1d29517ecc4063dd9f033faa";
        assert_eq!(&hash(&data).to_string(), expected);
    }
}
