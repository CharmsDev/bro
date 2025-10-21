/**
 * Protected UTXO Values - Digital Assets
 * 
 * These values represent digital assets (Ordinals, Runes, BRC-20, etc.)
 * that should NOT be spent in regular transactions.
 * 
 * NOTE: 5000 is NOT included - these are our valid minting UTXOs
 */

export const PROTECTED_VALUES = {
  ORDINALS_DUST: 546,      // Ordinals & Runes - Minimum dust limit
  RARE_SATS_A: 333,        // Rare Sats - Common marker
  RARE_SATS_B: 330,        // Rare Sats - Alternative marker
  BRC20_SMALL: 1000,       // BRC-20 & Ordinals - Small transfers
  LUCKY_SATS: 777,         // Lucky Sats - Collectible
  STAMPS: 600,             // Bitcoin Stamps (SRC-20)
  ORDINALS_LARGE: 10000,   // Large Inscriptions
};

export const PROTECTED_VALUES_ARRAY = Object.values(PROTECTED_VALUES);

/**
 * Check if a UTXO is protected (contains digital assets)
 * @param {Object} utxo - UTXO object with value property
 * @returns {boolean} - True if UTXO is protected
 */
export function isProtectedUtxo(utxo) {
  return PROTECTED_VALUES_ARRAY.includes(utxo.value);
}

/**
 * Filter out protected UTXOs from a list
 * @param {Array} utxos - Array of UTXO objects
 * @returns {Array} - Filtered array without protected UTXOs
 */
export function filterProtectedUtxos(utxos) {
  return utxos.filter(utxo => !isProtectedUtxo(utxo));
}
