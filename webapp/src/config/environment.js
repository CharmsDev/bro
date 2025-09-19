// Environment configuration for CharmsGión Bro
class EnvironmentConfig {
    constructor() {
        // Get network from environment variables
        const network = import.meta.env.VITE_BITCOIN_NETWORK;
        console.log(`[Environment] Constructor - VITE_BITCOIN_NETWORK: ${network}`);

        // Select QuickNode credentials based on network
        let quicknodeUrl, quicknodeApiKey;

        if (network === 'mainnet') {
            quicknodeUrl = import.meta.env.VITE_QUICKNODE_BITCOIN_MAINNET_URL;
            quicknodeApiKey = import.meta.env.VITE_QUICKNODE_BITCOIN_MAINNET_API_KEY;
        } else {
            // Default to testnet4
            quicknodeUrl = import.meta.env.VITE_QUICKNODE_BITCOIN_TESTNET_URL;
            quicknodeApiKey = import.meta.env.VITE_QUICKNODE_API_KEY;
        }

        // Configuration object
        this.config = {
            bitcoin: {
                network: network,
                quicknode: {
                    url: quicknodeUrl,
                    apiKey: quicknodeApiKey
                }
            },
            http: {
                // HTTP client settings with safe defaults; can be overridden via Vite env
                timeoutMs: Number(import.meta.env.VITE_HTTP_TIMEOUT_MS ?? 10000),
                retries: Number(import.meta.env.VITE_HTTP_RETRIES ?? 2),
                backoffBaseMs: Number(import.meta.env.VITE_HTTP_BACKOFF_BASE_MS ?? 500),
                // cache TTLs for polling endpoints (short to avoid stale UI)
                cacheTtl: {
                    txMs: Number(import.meta.env.VITE_CACHE_TTL_TX_MS ?? 3000),
                    utxosMs: Number(import.meta.env.VITE_CACHE_TTL_UTXOS_MS ?? 5000),
                    blocksMs: Number(import.meta.env.VITE_CACHE_TTL_BLOCKS_MS ?? 3000)
                }
            },
            ui: {
                // Feature flag to disable step/button locks across the UI
                disableStepLocks: String(import.meta.env.VITE_DISABLE_STEP_LOCKS ?? 'false').toLowerCase() === 'true'
            },
            prover: {
                // Prover API endpoint for Step 5
                apiUrl: String(import.meta.env.VITE_PROVER_API_URL)
            }
        };
    }

    // Get prover API URL - supports custom prover override
    getProverApiUrl(customUrl = null) {
        if (customUrl && this.isValidUrl(customUrl)) {
            console.log(`[Environment] Using custom prover URL: ${customUrl}`);
            return customUrl;
        }
        
        const defaultUrl = this.config.prover.apiUrl;
        console.log(`[Environment] Using default prover URL: ${defaultUrl}`);
        return defaultUrl;
    }

    // Validate URL format
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Get the current Bitcoin network
    getNetwork() {
        console.log(`[Environment] VITE_BITCOIN_NETWORK: ${import.meta.env.VITE_BITCOIN_NETWORK}`);
        console.log(`[Environment] Configured network: ${this.config.bitcoin.network}`);
        return this.config.bitcoin.network;
    }

    // Get QuickNode URL
    getQuickNodeUrl() {
        return this.config.bitcoin.quicknode.url;
    }

    // Get QuickNode API Key
    getQuickNodeApiKey() {
        return this.config.bitcoin.quicknode.apiKey;
    }

    // Check if we're on testnet
    isTestnet() {
        return this.getNetwork().includes('testnet');
    }

    // Get explorer URL for transactions
    getExplorerUrl(txid) {
        const baseUrl = this.isTestnet()
            ? 'https://mempool.space/testnet4'
            : 'https://mempool.space';
        return `${baseUrl}/tx/${txid}`;
    }

    // Get mempool.space API base URL (network-aware)
    // Used only for UI explorer links - all API operations use QuickNode
    getMempoolApiBase() {
        return this.isTestnet()
            ? 'https://mempool.space/testnet4/api'
            : 'https://mempool.space/api';
    }

    // HTTP client settings
    getHttpTimeoutMs() {
        return this.config.http.timeoutMs;
    }

    getHttpRetries() {
        return this.config.http.retries;
    }

    getHttpBackoffBaseMs() {
        return this.config.http.backoffBaseMs;
    }

    getCacheTtl() {
        return this.config.http.cacheTtl;
    }


    // UI feature flags
    getDisableStepLocks() {
        return this.config.ui.disableStepLocks === true;
    }

    // Prover API URL (Step 5)
    getProverApiUrl() {
        return this.config.prover.apiUrl;
    }
}

// Export singleton instance
export const environmentConfig = new EnvironmentConfig();
export default environmentConfig;
