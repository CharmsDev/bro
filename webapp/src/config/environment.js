// Environment configuration for CharmsGión Bro
class EnvironmentConfig {
    constructor() {
        // Get network from environment variables
        const network = import.meta.env.VITE_BITCOIN_NETWORK;

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
            }
        };
    }

    // Get the current Bitcoin network
    getNetwork() {
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
}

// Export singleton instance
export const environmentConfig = new EnvironmentConfig();
export default environmentConfig;
