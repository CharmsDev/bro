// Bitcoin Transaction Confirmation Monitor
import { environmentConfig } from '../../config/environment.js';

export class ConfirmationMonitor {
    constructor() {
        this.quicknodeUrl = environmentConfig.getQuickNodeUrl();
        this.quicknodeApiKey = environmentConfig.getQuickNodeApiKey();
    }

    // Wait for transaction confirmation
    async waitForConfirmation(txid, requiredConfirmations = 1, pollInterval = 10000) {
        
        let attempts = 0;
        const maxAttempts = 360; // 1 hour max (360 * 10s)

        while (attempts < maxAttempts) {
            try {
                const txInfo = await this.getTransactionInfo(txid);
                
                if (txInfo && txInfo.confirmations >= requiredConfirmations) {
                    return {
                        confirmed: true,
                        confirmations: txInfo.confirmations,
                        blockHeight: txInfo.blockHeight,
                        blockHash: txInfo.blockHash
                    };
                }

                
                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                attempts++;

            } catch (error) {
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                attempts++;
            }
        }

        throw new Error('Timeout waiting for transaction confirmation');
    }

    // Get transaction info from QuickNode
    async getTransactionInfo(txid) {
        try {
            const response = await fetch(this.quicknodeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.quicknodeApiKey}`
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getrawtransaction',
                    params: [txid, true] // verbose = true
                })
            });

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error.message);
            }

            const tx = result.result;
            
            return {
                txid: tx.txid,
                confirmations: tx.confirmations || 0,
                blockHeight: tx.blockheight,
                blockHash: tx.blockhash
            };

        } catch (error) {
            return null;
        }
    }
}
