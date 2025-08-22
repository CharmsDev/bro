export class ConfirmationMonitorService {
    constructor() {
        this.mempoolApiUrl = 'https://mempool.space/testnet4/api';
        this.pollingInterval = 30000; // 30 seconds
        this.maxRetries = 999999; // Unlimited retries
        this.requestTimeout = 15000; // 15 seconds timeout
        this.maxBackoffDelay = 300000; // 5 minutes max backoff
        this.cancelled = false;
        this.consecutiveErrors = 0;
        this.maxConsecutiveErrors = 10;
    }

    // Wait for transaction confirmation and return block hash
    async waitForConfirmation(txid, onProgress = null) {
        this.cancelled = false;
        this.consecutiveErrors = 0;
        let retries = 0;

        while (retries < this.maxRetries && !this.cancelled) {
            try {
                const txData = await this._fetchTxDataWithRetry(txid);

                if (txData.status && txData.status.confirmed) {
                    return this._handleConfirmedTransaction(txData, onProgress);
                }

                // Transaction still pending - reset error counter on success
                this.consecutiveErrors = 0;
                this._notifyPendingStatus(retries, onProgress);

            } catch (error) {
                const shouldContinue = await this._handleTransactionError(error, retries, onProgress);
                if (!shouldContinue) {
                    throw error;
                }
            }

            retries++;

            if (retries < this.maxRetries && !this.cancelled) {
                const delay = this._calculateBackoffDelay(this.consecutiveErrors);
                await this.sleep(delay);
            }
        }

        if (this.cancelled) {
            throw new Error('Transaction monitoring was cancelled');
        }

        throw new Error(`Transaction confirmation timeout after ${this.maxRetries} attempts`);
    }

    // Helper method to handle confirmed transactions
    _handleConfirmedTransaction(txData, onProgress) {
        const blockHash = txData.status.block_hash;
        const blockHeight = txData.status.block_height;
        const confirmations = txData.status.confirmations || 1;

        if (onProgress) {
            onProgress({
                status: 'confirmed',
                blockHash,
                blockHeight,
                confirmations
            });
        }

        return {
            confirmed: true,
            blockHash,
            blockHeight,
            confirmations
        };
    }

    // Helper method to notify pending status
    _notifyPendingStatus(retries, onProgress) {
        if (onProgress) {
            onProgress({
                status: 'pending',
                retries,
                maxRetries: this.maxRetries,
                nextCheck: this.pollingInterval / 1000,
                consecutiveErrors: this.consecutiveErrors
            });
        }
    }

    // Helper method to handle transaction errors with recovery logic
    async _handleTransactionError(error, retries, onProgress) {
        this.consecutiveErrors++;

        const isNetworkError = this._isNetworkError(error);
        const isRecoverableError = this._isRecoverableError(error);

        if (onProgress) {
            onProgress({
                status: 'error',
                error: error.message,
                retries,
                consecutiveErrors: this.consecutiveErrors,
                isNetworkError,
                isRecoverable: isRecoverableError,
                canRetry: this.consecutiveErrors < this.maxConsecutiveErrors
            });
        }

        // If too many consecutive errors, offer manual retry option
        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
            if (onProgress) {
                onProgress({
                    status: 'critical_error',
                    error: error.message,
                    retries,
                    consecutiveErrors: this.consecutiveErrors,
                    requiresManualRetry: true
                });
            }

            // Wait for potential manual intervention
            await this.sleep(60000); // Wait 1 minute before continuing
            this.consecutiveErrors = 0; // Reset counter to allow continuation
        }

        return isRecoverableError;
    }

    // Check if error is network-related
    _isNetworkError(error) {
        const networkErrorPatterns = [
            'ERR_NETWORK_CHANGED',
            'ERR_NAME_NOT_RESOLVED',
            'ERR_INTERNET_DISCONNECTED',
            'ERR_CONNECTION_REFUSED',
            'Failed to fetch',
            'Network request failed',
            'TypeError: Failed to fetch'
        ];

        return networkErrorPatterns.some(pattern =>
            error.message.includes(pattern) || error.toString().includes(pattern)
        );
    }

    // Check if error is recoverable
    _isRecoverableError(error) {
        const nonRecoverablePatterns = [
            'Transaction not found in mempool or recent blocks',
            'Invalid transaction ID'
        ];

        return !nonRecoverablePatterns.some(pattern =>
            error.message.includes(pattern)
        );
    }

    // Calculate backoff delay with exponential backoff for errors
    _calculateBackoffDelay(consecutiveErrors) {
        if (consecutiveErrors === 0) {
            return this.pollingInterval;
        }

        // Exponential backoff: 30s, 60s, 120s, 240s, 300s (max)
        const backoffMultiplier = Math.min(Math.pow(2, consecutiveErrors - 1), 10);
        const delay = Math.min(this.pollingInterval * backoffMultiplier, this.maxBackoffDelay);

        return delay;
    }

    // Fetch transaction data with timeout and retry logic
    async _fetchTxDataWithRetry(txid, maxAttempts = 3) {
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await this._fetchTxDataWithTimeout(txid);
            } catch (error) {
                lastError = error;

                if (attempt < maxAttempts && this._isNetworkError(error)) {
                    await this.sleep(2000 * attempt); // Progressive delay
                    continue;
                }

                throw error;
            }
        }

        throw lastError;
    }

    // Fetch transaction data with timeout
    async _fetchTxDataWithTimeout(txid) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        try {
            const response = await fetch(`${this.mempoolApiUrl}/tx/${txid}`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                return await this._handleApiError(response, txid);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${this.requestTimeout / 1000}s`);
            }

            throw error;
        }
    }

    // Handle API errors with fallback strategies
    async _handleApiError(response, txid) {
        if (response.status === 404) {
            // Transaction not found - search in recent blocks
            try {
                const recentBlocks = await this.getRecentBlocks(10);
                for (const block of recentBlocks) {
                    const blockTxs = await this.getBlockTransactions(block.id);
                    if (blockTxs.includes(txid)) {
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
                console.error('Error searching recent blocks:', blockSearchError);
            }

            throw new Error(`Transaction not found in mempool or recent blocks. Check if transaction ID is correct.`);
        }

        throw new Error(`Failed to fetch transaction data: ${response.status} ${response.statusText}`);
    }

    // Public method to manually retry after errors
    resetErrorState() {
        this.consecutiveErrors = 0;
    }

    // Get transaction data from mempool API (legacy method for backward compatibility)
    async getTxData(txid) {
        return await this._fetchTxDataWithTimeout(txid);
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
