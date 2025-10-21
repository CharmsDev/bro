// Batch configuration constants
export const BATCH_SIZES = [1, 4, 8, 16, 32, 64, 128, 256];

export const BATCH_CONFIG = {
  // Cost per mint in satoshis
  COST_PER_MINT: 900,
  
  // Minimum UTXO value to be considered usable
  MIN_UTXO_VALUE: 546, // Dust limit
  
  // Maximum batch size allowed
  MAX_BATCH_SIZE: 256,
  
  // Minimum batch size
  MIN_BATCH_SIZE: 1,
  
  // Default batch size
  DEFAULT_BATCH_SIZE: 1
};

export const FUNDING_STATUS = {
  INSUFFICIENT: 'insufficient',
  SUFFICIENT: 'sufficient',
  MONITORING: 'monitoring',
  ERROR: 'error'
};

// Calculate required funds for a given batch size
export function calculateRequiredFunds(batchSize) {
  return batchSize * BATCH_CONFIG.COST_PER_MINT;
}

// Calculate how many mints are possible with available funds
export function calculateMaxMints(availableFunds) {
  return Math.floor(availableFunds / BATCH_CONFIG.COST_PER_MINT);
}

// Validate batch size
export function validateBatchSize(batchSize) {
  const size = parseInt(batchSize);
  
  if (isNaN(size)) {
    return { valid: false, error: 'Batch size must be a number' };
  }
  
  if (size < BATCH_CONFIG.MIN_BATCH_SIZE) {
    return { valid: false, error: `Minimum batch size is ${BATCH_CONFIG.MIN_BATCH_SIZE}` };
  }
  
  if (size > BATCH_CONFIG.MAX_BATCH_SIZE) {
    return { valid: false, error: `Maximum batch size is ${BATCH_CONFIG.MAX_BATCH_SIZE}` };
  }
  
  return { valid: true };
}
