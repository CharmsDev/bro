use wasm_bindgen::prelude::wasm_bindgen;

const DENOMINATION: u64 = 100_000_000;
const HALVING_PERIOD_DAYS: u64 = 14;
const SECONDS_PER_PERIOD: u64 = HALVING_PERIOD_DAYS * 24 * 3600;

// Tue Sep  2 04:20:00 UTC 2025.
const START_TIME: u64 = 1756786800;

// 7/26/2025 20:00:00 UTC
// const START_TIME: u64 = 1_753_560_000;

#[wasm_bindgen]
pub fn mined_amount(block_time: u64, clz: usize) -> u64 {
    let block_time = if block_time < START_TIME { START_TIME } else { block_time };
    let clz = clz as u64;
    let clz_pow_2 = clz.pow(2);
    let halving_factor = 2u64.pow(((block_time - START_TIME) / SECONDS_PER_PERIOD) as u32);
    DENOMINATION * clz_pow_2 / halving_factor
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = mined_amount(START_TIME + 1, 64);
        assert_eq!(409600000000, result);
    }

    #[test]
    fn still_works_with_time_before_start() {
        let result = mined_amount(START_TIME - 1, 64);
        assert_eq!(409600000000, result);
    }
}
