// Minting Loop Constants

export const OUTPUT_STATUS = {
  PENDING: 'pending',      // Gris - esperando análisis
  READY: 'ready',          // Naranja - listo para mintear
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

export const SUB_STEPS = {
  COMPOSE_PAYLOAD: 'compose_payload',
  CALL_PROVER: 'call_prover',
  SIGN_TXS: 'sign_txs',
  BROADCAST: 'broadcast'
};

export const PROVER_RETRY_CONFIG = {
  MAX_RETRIES: 5,
  RETRY_DELAYS: [1000, 2000, 4000, 8000, 16000], // Exponential backoff
  RETRY_STATUS_CODES: [500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511]
};
