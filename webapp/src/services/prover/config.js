/**
 * Prover Service Configuration
 * Centralizes all configuration constants and URLs
 */

export const PROVER_CONFIG = {
    // API endpoints
    API_URL: 'https://charms-prover-test.fly.dev/spells/prove',
    MEMPOOL_BASE_URL: 'https://mempool.space/testnet4/api',
    
    // Template paths (tried in order) - comprehensive fallback strategy
    TEMPLATE_PATHS: [
        // Vite build output paths
        './assets/payload/request.json',
        '/assets/payload/request.json', 
        'assets/payload/request.json',
        
        // Development server paths
        '/src/assets/payload/request.json',
        './src/assets/payload/request.json',
        'src/assets/payload/request.json',
        
        // Static file server paths (common in deployments)
        '/static/assets/payload/request.json',
        './static/assets/payload/request.json',
        'static/assets/payload/request.json',
        
        // Public folder paths (some build systems)
        '/public/assets/payload/request.json',
        './public/assets/payload/request.json',
        'public/assets/payload/request.json',
        
        // Dist folder paths (build output)
        '/dist/assets/payload/request.json',
        './dist/assets/payload/request.json',
        'dist/assets/payload/request.json'
    ],
    
    // WASM configuration
    WASM_HASH: '6c730a8c2525445acd8efecb8dae6549dc64ce78ef3c50631ee0dad9ab8f7618',
    
    // Mining configuration
    DEFAULT_BASE_REWARD: 144.5,
    DECIMAL_PLACES: 8, // Like Bitcoin
    
    // LocalStorage keys
    STORAGE_KEYS: {
        TRANSACTION_DATA: 'bro_transaction_data',
        WALLET_DATA: 'bro_wallet_data',
        MINING_RESULT: 'miningResult',
        BROADCAST_DATA: 'bro_broadcast_data'
    }
};
