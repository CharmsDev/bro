export class ConfirmationMonitorService {
    constructor() {
        this.mempoolApiUrl = 'https://mempool.space/testnet4/api';
        this.pollingInterval = 60000; // 1 minute
        this.maxRetries = 999999; // Unlimited retries
    }

    // Wait for transaction confirmation and return block hash
    async waitForConfirmation(txid, onProgress = null) {
        console.log(`🔍 Starting confirmation monitoring for txid: ${txid}`);

        let retries = 0;

        while (retries < this.maxRetries) {
            try {
                const txData = await this.getTxData(txid);

                if (txData.status && txData.status.confirmed) {
                    const blockHash = txData.status.block_hash;
                    const blockHeight = txData.status.block_height;

                    console.log(`✅ Transaction confirmed in block: ${blockHash} (height: ${blockHeight})`);

                    if (onProgress) {
                        onProgress({
                            status: 'confirmed',
                            blockHash,
                            blockHeight,
                            confirmations: txData.status.confirmations || 1
                        });
                    }

                    return {
                        confirmed: true,
                        blockHash,
                        blockHeight,
                        confirmations: txData.status.confirmations || 1
                    };
                }

                // Transaction still in mempool
                if (onProgress) {
                    onProgress({
                        status: 'pending',
                        retries,
                        maxRetries: this.maxRetries,
                        nextCheck: this.pollingInterval / 1000
                    });
                }

                console.log(`⏳ Transaction still pending... (attempt ${retries + 1}/${this.maxRetries})`);

            } catch (error) {
                console.error(`❌ Error checking transaction status:`, error);

                if (onProgress) {
                    onProgress({
                        status: 'error',
                        error: error.message,
                        retries
                    });
                }
            }

            retries++;

            if (retries < this.maxRetries) {
                await this.sleep(this.pollingInterval);
            }
        }

        throw new Error(`Transaction confirmation timeout after ${this.maxRetries} attempts`);
    }

    // Get transaction data from mempool API
    async getTxData(txid) {
        const response = await fetch(`${this.mempoolApiUrl}/tx/${txid}`);

        if (!response.ok) {
            if (response.status === 404) {
                // Transaction not found - could be very old, confirmed long ago, or rejected
                console.log(`⚠️ Transaction ${txid} not found in mempool API (404)`);

                // Try to check if it might be in a recent block by searching
                try {
                    const recentBlocks = await this.getRecentBlocks(10);
                    for (const block of recentBlocks) {
                        const blockTxs = await this.getBlockTransactions(block.id);
                        if (blockTxs.includes(txid)) {
                            console.log(`✅ Found transaction in block ${block.id}`);
                            return {
                                status: {
                                    confirmed: true,
                                    block_hash: block.id,
                                    block_height: block.height,
                                    confirmations: await this.calculateConfirmations(block.height)
                                }
                            };
                        }
                    }
                } catch (blockSearchError) {
                    console.log(`⚠️ Could not search recent blocks: ${blockSearchError.message}`);
                }

                throw new Error(`Transaction not found in mempool or recent blocks. Check if transaction ID is correct.`);
            }
            throw new Error(`Failed to fetch transaction data: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    // Get recent blocks for searching
    async getRecentBlocks(count = 10) {
        try {
            const response = await fetch(`${this.mempoolApiUrl}/blocks`);
            if (!response.ok) {
                throw new Error(`Failed to fetch blocks: ${response.status}`);
            }
            const blocks = await response.json();
            return blocks.slice(0, count);
        } catch (error) {
            console.error('Error fetching recent blocks:', error);
            return [];
        }
    }

    // Get transactions in a specific block
    async getBlockTransactions(blockHash) {
        try {
            const response = await fetch(`${this.mempoolApiUrl}/block/${blockHash}/txids`);
            if (!response.ok) {
                throw new Error(`Failed to fetch block transactions: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching transactions for block ${blockHash}:`, error);
            return [];
        }
    }

    // Calculate confirmations based on block height
    async calculateConfirmations(blockHeight) {
        try {
            const currentHeight = await this.getCurrentBlockHeight();
            return parseInt(currentHeight) - blockHeight + 1;
        } catch (error) {
            console.error('Error calculating confirmations:', error);
            return 1; // Default to 1 confirmation
        }
    }

    // Check if transaction exists in mempool
    async checkTxExists(txid) {
        try {
            const txData = await this.getTxData(txid);
            return {
                exists: true,
                confirmed: txData.status && txData.status.confirmed,
                blockHash: txData.status?.block_hash,
                blockHeight: txData.status?.block_height
            };
        } catch (error) {
            return {
                exists: false,
                error: error.message
            };
        }
    }

    // Get current block height
    async getCurrentBlockHeight() {
        try {
            const response = await fetch(`${this.mempoolApiUrl}/blocks/tip/height`);
            if (!response.ok) {
                throw new Error(`Failed to fetch block height: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error('Error fetching current block height:', error);
            throw error;
        }
    }

    // Sleep utility
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Cancel monitoring (for cleanup)
    cancel() {
        this.cancelled = true;
    }
}
