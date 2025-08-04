// Environment configuration for CharmsGión Bro
class EnvironmentConfig {
    constructor() {
        // Default configuration
        this.config = {
            bitcoin: {
                network: 'testnet4',
                apis: {
                    mempool: {
                        testnet4: 'https://mempool.space/testnet4/api',
                        mainnet: 'https://mempool.space/api'
                    }
                }
            }
        };
    }

    // Get the current Bitcoin network
    getNetwork() {
        return this.config.bitcoin.network;
    }

    // Get the mempool API URL for the current network
    getMempoolApiUrl() {
        const network = this.getNetwork();
        return this.config.bitcoin.apis.mempool[network];
    }

    // Get the broadcast API URL
    getBroadcastApiUrl() {
        return `${this.getMempoolApiUrl()}/tx`;
    }

    // Check if we're on testnet
    isTestnet() {
        return this.getNetwork().includes('testnet');
    }

    // Get transaction status API URL
    getTransactionStatusUrl(txid) {
        return `${this.getMempoolApiUrl()}/tx/${txid}`;
    }
}

// Export singleton instance
export const environmentConfig = new EnvironmentConfig();
export default environmentConfig;
