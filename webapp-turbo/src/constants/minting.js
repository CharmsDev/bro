/**
 * Minting Constants
 * Centralized configuration for BRO token minting process
 */

/**
 * Minimum UTXO value required for minting
 * This covers: prover output (330) + change (2500) + fees (1000) + mining (333) - 333 ≈ 5000 sats
 */
export const MINTING_UTXO_VALUE = 5000;

/**
 * Dust limit for Bitcoin (minimum spendable UTXO)
 */
export const DUST_LIMIT = 546;

/**
 * Protected UTXO values (ordinals, inscriptions, special markers)
 * These values should never be spent to prevent asset destruction
 */
export const PROTECTED_VALUES = [
  330,   // Taproot dust limit
  333,   // Turbomining spendable outputs
  546,   // Bitcoin dust limit (Ordinals/Inscriptions/Runes minimum)
  600,   // Stamps Protocol (SRC-20)
  777,   // Lucky Sats - Collectible satoshis
  1000,  // Fee transactions
  5000,  // Medium Inscriptions
  10000  // Large Inscriptions (0.0001 BTC)
];
