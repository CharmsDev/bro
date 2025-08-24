import QuickNodeClient from './bitcoin/quicknode-client.js';

export class ConfirmationMonitorService {
    constructor() {
        this.client = new QuickNodeClient();
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
                const t0 = Date.now();
                const txData = await this._fetchTxDataWithRetry(txid);

                if (txData.confirmations && txData.confirmations >= 1) {
                    return await this._handleConfirmedTransaction(txData, onProgress);
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
    async _handleConfirmedTransaction(txData, onProgress) {
        const blockHash = txData.blockhash;
        const confirmations = txData.confirmations || 1;
        let blockHeight = txData.height || null;

        // Bitcoin Core getrawtransaction (verbose) does not include height; fetch header if missing
        if (!blockHeight && blockHash) {
            try {
                const header = await this.client.getBlockHeader(blockHash, true);
                if (header && typeof header.height === 'number') {
                    blockHeight = header.height;
                }
            } catch (e) {
                // Keep blockHeight as null if header fetch fails; downstream validator will surface a clear error
            }
        }

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
            'Transaction not found in API or recent blocks',
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
            // QuickNode: getrawtransaction verbose true
            const json = await this.client.getRawTransaction(txid, true);
            clearTimeout(timeoutId);
            return json;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${this.requestTimeout / 1000}s`);
            }

            // If underlying fetch failed, we don't have a Response to inspect; rethrow
            console.error('[Confirm] getrawtransaction error:', error.message);
            throw error;
        }
    }

    // Handle API errors with fallback strategies
    async _handleApiError(_response, txid) {
        // For RPC we don't have HTTP response objects here; fallback search in recent blocks
        try {
            const recentBlocks = await this.getRecentBlocks(10);
            for (const block of recentBlocks) {
                const blockTxs = await this.getBlockTransactions(block.hash);
                if (blockTxs.includes(txid)) {
                    const confirmations = await this.calculateConfirmations(block.height);
                    return {
                        blockhash: block.hash,
                        confirmations,
                        height: block.height
                    };
                }
            }
        } catch (blockSearchError) {
            // Block search failed
        }
        throw new Error(`Transaction not found in recent blocks or API.`);
    }

    // Public method to manually retry after errors
    resetErrorState() {
        this.consecutiveErrors = 0;
    }

    // Get transaction data from API (legacy method for backward compatibility)
    async getTxData(txid) {
        return await this._fetchTxDataWithTimeout(txid);
    }

    // Get recent blocks for searching
    async getRecentBlocks(count = 10) {
        try {
            const tip = await this.getCurrentBlockHeight();
            const heights = Array.from({ length: count }, (_, i) => tip - i).filter(h => h >= 0);
            const blocks = [];
            for (const h of heights) {
                const hash = await this.client.getBlockHash(h);
                blocks.push({ hash, height: h });
            }
            return blocks;
        } catch (error) {
            console.error('Error fetching recent blocks:', error);
            return [];
        }
    }

    // Get transactions in a specific block
    async getBlockTransactions(blockHash) {
        try {
            // verbosity 1 returns tx array of txids
            const blk = await this.client.getBlock(blockHash, 1);
            return blk.tx || [];
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
            return 1; // Default to 1 confirmation
        }
    }

    // Check if transaction exists in API
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
            const h = await this.client.getBlockCount();
            return h;
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
