import BitcoinApiRouter from '../providers/bitcoin-api-router/index.js';

// UTXO Monitor Service - Monitors Bitcoin address for incoming UTXOs
export class UtxoMonitorService {
    constructor() {
        this.client = new BitcoinApiRouter();
        this.basePollingInterval = 20000; // 20 seconds
        this.minPollingInterval = 15000;  // 15 seconds
        this.maxPollingInterval = 180000; // 3 minutes
        this.backoffMultiplier = 2.0;
        this.recoveryMultiplier = 0.8;
        this.maxConsecutiveErrors = 3;
        this.minimumUtxoValue = 6900; // Minimum UTXO value in satoshis
    }

    async getAddressUtxos(address) {
        try {
            // Use BitcoinApiRouter for QuickNode + Mempool fallback
            const utxos = await this.client.getAddressUtxos(address);
            
            if (!Array.isArray(utxos) || utxos.length === 0) {
                return [];
            }

            // Format UTXOs to match expected structure
            const formattedUtxos = utxos.map(utxo => ({
                txid: utxo.txid,
                vout: utxo.vout,
                value: parseInt(utxo.value), // Already in satoshis
                confirmed: (utxo.confirmations || 0) > 0,
                address: address
            }));

            return formattedUtxos;
        } catch (error) {
            console.error('[UtxoMonitor] Error fetching UTXOs:', error);
            return [];
        }
    }

    async monitorAddress(address, onUtxoFound, onStatusUpdate, onError) {
        let pollingCount = 0;
        let currentInterval = this.basePollingInterval;
        let consecutiveErrors = 0;
        let consecutiveSuccesses = 0;
        let isMonitoring = true;

        const poll = async () => {
            if (!isMonitoring) {
                return;
            }

            try {
                pollingCount++;
                const startTime = Date.now();

                if (onStatusUpdate) {
                    const intervalSec = Math.round(currentInterval / 1000);
                    onStatusUpdate({
                        status: 'checking',
                        message: `Checking for UTXOs... (attempt #${pollingCount})`,
                        pollingCount,
                        currentInterval: intervalSec
                    });
                }

                const utxos = await this.getAddressUtxos(address);
                const requestTime = Date.now() - startTime;

                consecutiveErrors = 0;
                consecutiveSuccesses++;

                // Optimize polling interval based on success pattern
                if (consecutiveSuccesses >= 3 && currentInterval > this.minPollingInterval) {
                    currentInterval = Math.max(
                        currentInterval * this.recoveryMultiplier,
                        this.minPollingInterval
                    );
                }

                if (utxos && utxos.length > 0) {
                    const validUtxos = utxos.filter(utxo => parseInt(utxo.value) >= this.minimumUtxoValue);

                    if (validUtxos.length > 0) {
                        // Select the largest UTXO for mining (most efficient)
                        const largestUtxo = validUtxos.reduce((largest, current) =>
                            parseInt(current.value) > parseInt(largest.value) ? current : largest
                        );

                        const formattedUtxo = {
                            txid: largestUtxo.txid,
                            vout: largestUtxo.vout,
                            value: parseInt(largestUtxo.value),
                            amount: parseInt(largestUtxo.value), // Alias for compatibility
                            scriptPubKey: '',
                            address: address,
                            confirmations: largestUtxo.confirmations || 0
                        };

                        isMonitoring = false;
                        
                        if (onUtxoFound) {
                            onUtxoFound(formattedUtxo);
                        }
                        return;
                    }
                    
                    // Log details of found UTXOs for debugging
                    utxos.forEach((utxo, i) => {
                    });
                }

                if (!utxos || utxos.length === 0) {
                }

                setTimeout(poll, currentInterval);

            } catch (error) {
                consecutiveErrors++;
                consecutiveSuccesses = 0;

                const isRateLimit = error.message.includes('429') ||
                    error.message.includes('Too Many Requests') ||
                    error.message.includes('CORS');

                const isNetworkError = error.message.includes('fetch') ||
                    error.message.includes('Failed to fetch') ||
                    error.message.includes('NetworkError');

                if (isRateLimit) {
                    currentInterval = Math.min(
                        currentInterval * this.backoffMultiplier,
                        this.maxPollingInterval
                    );
                } else if (consecutiveErrors >= this.maxConsecutiveErrors) {
                    currentInterval = Math.min(
                        currentInterval * 1.5,
                        this.maxPollingInterval
                    );
                }

                const isFatalError = !isRateLimit && !isNetworkError && consecutiveErrors > 10;

                if (!isFatalError && isMonitoring) {
                    if (onStatusUpdate) {
                        const waitTime = Math.round(currentInterval / 1000);
                        let message;
                        if (isRateLimit) {
                            message = `Rate limited, waiting ${waitTime}s... (attempt #${pollingCount})`;
                        } else if (isNetworkError) {
                            message = `Network error, retrying in ${waitTime}s... (attempt #${pollingCount})`;
                        } else {
                            message = `Error occurred, retrying in ${waitTime}s... (attempt #${pollingCount})`;
                        }

                        onStatusUpdate({
                            status: 'error',
                            message,
                            pollingCount,
                            currentInterval: waitTime,
                            consecutiveErrors
                        });
                    }

                    setTimeout(poll, currentInterval);
                } else {
                    isMonitoring = false;
                    if (onError) {
                        onError(error);
                    }
                }
            }
        };

        poll();

        // Return stop function
        return () => {
            isMonitoring = false;
        };
    }
}
