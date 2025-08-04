// Bitcoin Transaction Broadcasting Service
import { environmentConfig } from '../config/environment.js';

class BroadcastService {
    constructor() {
        this.config = environmentConfig;
    }

    /**
     * Broadcasts a signed Bitcoin transaction to the network
     * @param {string} txHex - The signed transaction in hex format
     * @returns {Promise<{txid: string, success: boolean}>}
     */
    async broadcastTransaction(txHex) {
        try {
            if (!txHex) {
                throw new Error('Transaction hex is required');
            }

            console.log('🚀 Broadcasting transaction to network...');
            console.log('Network:', this.config.getNetwork());
            console.log('API URL:', this.config.getBroadcastApiUrl());

            const response = await fetch(this.config.getBroadcastApiUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: txHex
            });

            if (!response.ok) {
                let errorText = 'Unknown error';
                let errorDetails = '';
                try {
                    errorText = await response.text();
                    errorDetails = ` | Response: ${errorText.substring(0, 200)}`;
                } catch (e) {
                    errorDetails = ' | Could not read response body';
                }
                
                console.error('🚨 Broadcast API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: this.config.getBroadcastApiUrl(),
                    responseText: errorText
                });
                
                throw new Error(`Broadcast failed (${response.status}): ${errorText || response.statusText}${errorDetails}`);
            }

            // mempool.space returns the txid as plain text
            const txid = await response.text();

            console.log('✅ Transaction broadcast successful!');
            console.log('Transaction ID:', txid);

            return {
                txid: txid.trim(),
                success: true
            };
        } catch (error) {
            console.error('❌ Transaction broadcast failed:', error);
            throw error;
        }
    }

    /**
     * Gets the status of a Bitcoin transaction
     * @param {string} txid - The transaction ID
     * @returns {Promise<Object>} Transaction status information
     */
    async getTransactionStatus(txid) {
        try {
            if (!txid) {
                throw new Error('Transaction ID is required');
            }

            console.log('🔍 Checking transaction status for:', txid);

            const response = await fetch(this.config.getTransactionStatusUrl(txid));

            if (!response.ok) {
                if (response.status === 404) {
                    return {
                        confirmed: false,
                        status: 'pending',
                        message: 'Transaction not found. It may be pending or not broadcast.'
                    };
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            return {
                confirmed: result.status?.confirmed || false,
                confirmations: result.status?.confirmations || 0,
                blockHeight: result.status?.block_height,
                blockHash: result.status?.block_hash,
                status: result.status?.confirmed ? 'confirmed' : 'pending',
                fee: result.fee,
                raw: result
            };
        } catch (error) {
            console.error('❌ Failed to get transaction status:', error);
            throw error;
        }
    }

    /**
     * Get a mempool.space explorer URL for the transaction
     * @param {string} txid - The transaction ID
     * @returns {string} Explorer URL
     */
    getExplorerUrl(txid) {
        const baseUrl = this.config.isTestnet() 
            ? 'https://mempool.space/testnet4' 
            : 'https://mempool.space';
        return `${baseUrl}/tx/${txid}`;
    }
}

// Export singleton instance
export const broadcastService = new BroadcastService();
export default broadcastService;
