class EnvironmentConfig {
    constructor() {
        const network = import.meta.env.VITE_BITCOIN_NETWORK;

        let quicknodeUrl, quicknodeApiKey;
        // Determine prover URL based on network
        let proverUrl;

        if (network === 'mainnet') {
            quicknodeUrl = import.meta.env.VITE_QUICKNODE_BITCOIN_MAINNET_URL;
            quicknodeApiKey = import.meta.env.VITE_QUICKNODE_BITCOIN_MAINNET_API_KEY;
            // Mainnet prover API from env (required for production)
            proverUrl = String(import.meta.env.VITE_PROVER_API_URL);
        } else {
            quicknodeUrl = import.meta.env.VITE_QUICKNODE_BITCOIN_TESTNET_URL;
            quicknodeApiKey = import.meta.env.VITE_QUICKNODE_API_KEY;
            // Testnet4 prover API (must be provided via env, no defaults)
            proverUrl = String(import.meta.env.VITE_PROVER_API_URL_T4 || '');
            if (!proverUrl) {
                throw new Error('VITE_PROVER_API_URL_T4 is required for testnet4 but is not set');
            }
        }

        this.config = {
            bitcoin: {
                network: network,
                quicknode: {
                    url: quicknodeUrl,
                    apiKey: quicknodeApiKey
                }
            },
            http: {
                timeoutMs: Number(import.meta.env.VITE_HTTP_TIMEOUT_MS ?? 10000),
                retries: Number(import.meta.env.VITE_HTTP_RETRIES ?? 2),
                backoffBaseMs: Number(import.meta.env.VITE_HTTP_BACKOFF_BASE_MS ?? 500),
                cacheTtl: {
                    txMs: Number(import.meta.env.VITE_CACHE_TTL_TX_MS ?? 3000),
                    utxosMs: Number(import.meta.env.VITE_CACHE_TTL_UTXOS_MS ?? 5000),
                    blocksMs: Number(import.meta.env.VITE_CACHE_TTL_BLOCKS_MS ?? 3000)
                }
            },
            ui: {
                disableStepLocks: String(import.meta.env.VITE_DISABLE_STEP_LOCKS ?? 'false').toLowerCase() === 'true'
            },
            prover: {
                apiUrl: proverUrl
            }
        };
    }

    getProverApiUrl(customUrl = null) {
        if (customUrl && this.isValidUrl(customUrl)) {
            return customUrl;
        }
        
        const defaultUrl = this.config.prover.apiUrl;
        return defaultUrl;
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    getNetwork() {
        return this.config.bitcoin.network;
    }

    getQuickNodeUrl() {
        return this.config.bitcoin.quicknode.url;
    }

    getQuickNodeApiKey() {
        return this.config.bitcoin.quicknode.apiKey;
    }

    isTestnet() {
        return this.getNetwork().includes('testnet');
    }

    getExplorerUrl(txid) {
        const baseUrl = this.isTestnet()
            ? 'https://mempool.space/testnet4'
            : 'https://mempool.space';
        return `${baseUrl}/tx/${txid}`;
    }

    // Used only for UI explorer links
    getMempoolApiBase() {
        return this.isTestnet()
            ? 'https://mempool.space/testnet4/api'
            : 'https://mempool.space/api';
    }

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

    getDisableStepLocks() {
        return this.config.ui.disableStepLocks === true;
    }
}

export const environmentConfig = new EnvironmentConfig();
export default environmentConfig;
