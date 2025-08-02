use sha2::{Digest, Sha256};
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
pub fn compute_mining_hash(challenge_txid: String, challenge_vout: u32, nonce: String) -> Vec<u8> {
    let hash_input = format!("{}:{}{}", challenge_txid, challenge_vout, nonce);

    dbg!(&hash_input);

    let hash_bytes = double_sha256(hash_input.as_bytes());
    hash_bytes
}

fn double_sha256(data: &[u8]) -> Vec<u8> {
    let hash = Sha256::digest(data);
    let hash = Sha256::digest(&hash);
    hash.to_vec()
}

#[wasm_bindgen]
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
