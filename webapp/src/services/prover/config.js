/**
 * Prover Service Configuration
 * Centralizes all configuration constants and URLs
 */

export const PROVER_CONFIG = {
    // API endpoints
    API_URL: 'https://charms-prover-test.fly.dev/spells/prove',
    MEMPOOL_BASE_URL: 'https://mempool.space/testnet4/api',



    // WASM configuration
    WASM_HASH: '6c730a8c2525445acd8efecb8dae6549dc64ce78ef3c50631ee0dad9ab8f7618',

    // Mining configuration
    DECIMAL_PLACES: 8, // Like Bitcoin

    // LocalStorage keys
    STORAGE_KEYS: {
        TRANSACTION_DATA: 'bro_transaction_data',
        WALLET_DATA: 'bro_wallet_data',
        MINING_RESULT: 'miningResult',
        BROADCAST_DATA: 'bro_broadcast_data'
    }
};
