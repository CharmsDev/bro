// Bitcoin API Service for real blockchain interactions
class BitcoinAPIService {
    constructor() {
        this.baseUrl = 'https://mempool.space/testnet4/api';
        this.basePollingInterval = 20000; // 20 seconds base (aggressive but safe)
        this.minPollingInterval = 15000; // 15 seconds minimum (with safety margin)
        this.maxPollingInterval = 180000; // 3 minutes maximum backoff
        this.backoffMultiplier = 2.0; // Double interval on rate limit
        this.recoveryMultiplier = 0.8; // Reduce interval by 20% on success
        this.maxConsecutiveErrors = 3; // Max errors before aggressive backoff
    }

    // Get address information including UTXOs
    async getAddressInfo(address) {
        try {
            const response = await fetch(`${this.baseUrl}/address/${address}`);
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching address info:', error);
            throw error;
        }
    }

    // Get UTXOs for an address
    async getAddressUtxos(address) {
        try {
            console.log('=== UTXO API REQUEST DEBUG ===');
            console.log('Address being queried:', address);
            console.log('Address length:', address.length);
            console.log('Address format check:', {
                startsWithTb1: address.startsWith('tb1'),
                hasValidLength: address.length >= 42 && address.length <= 62,
                containsInvalidChars: /[^a-z0-9]/.test(address.slice(3))
            });

            const url = `${this.baseUrl}/address/${address}/utxo`;
            console.log('Full API URL:', url);

            const response = await fetch(url);
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.log('Error response body:', errorText);
                throw new Error(`API request failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('API response data:', data);

            // Mempool.space returns array of UTXOs directly
            const utxos = Array.isArray(data) ? data : [];
            console.log('Extracted UTXOs:', utxos);
            console.log('=== END UTXO API DEBUG ===');

            return utxos;
        } catch (error) {
            console.error('Error fetching UTXOs:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // Continuous monitoring with intelligent rate limiting
    async monitorAddress(address, onUtxoFound, onStatusUpdate, onError) {
        console.log(`Starting continuous monitoring for address: ${address}`);

        let pollingCount = 0;
        let currentInterval = this.basePollingInterval;
        let consecutiveErrors = 0;
        let consecutiveSuccesses = 0;
        let isMonitoring = true;

        const poll = async () => {
            if (!isMonitoring) return;

            try {
                pollingCount++;
                const startTime = Date.now();

                // Update status
                if (onStatusUpdate) {
                    const intervalSec = Math.round(currentInterval / 1000);
                    onStatusUpdate({
                        status: 'checking',
                        message: `Monitoring blockchain... (check #${pollingCount}, ${intervalSec}s interval)`,
                        pollingCount,
                        currentInterval: intervalSec
                    });
                }

                // Fetch UTXOs
                const utxos = await this.getAddressUtxos(address);
                const requestTime = Date.now() - startTime;

                // Success! Reset error count and potentially optimize interval
                consecutiveErrors = 0;
                consecutiveSuccesses++;

                // Optimize interval based on success pattern
                if (consecutiveSuccesses >= 3 && currentInterval > this.minPollingInterval) {
                    // Gradually reduce interval (be more aggressive) after consecutive successes
                    currentInterval = Math.max(
                        currentInterval * this.recoveryMultiplier,
                        this.minPollingInterval
                    );
                    console.log(`Optimizing interval to ${currentInterval}ms after ${consecutiveSuccesses} successes`);
                }

                if (utxos && utxos.length > 0) {
                    // Filter UTXOs with minimum amount (10,000 satoshis)
                    const validUtxos = utxos.filter(utxo => utxo.value >= 10000);

                    if (validUtxos.length > 0) {
                        // Use the first valid UTXO
                        const utxo = validUtxos[0];
                        const formattedUtxo = {
                            txid: utxo.txid,
                            vout: utxo.vout,
                            amount: utxo.value,
                            scriptPubKey: '', // Will be filled by transaction builder
                            address: address,
                            confirmations: utxo.status?.confirmed ? utxo.status.block_height : 0
                        };

                        console.log('🎉 UTXO found! Stopping monitoring:', formattedUtxo);
                        isMonitoring = false;
                        if (onUtxoFound) {
                            onUtxoFound(formattedUtxo);
                        }
                        return; // Stop polling
                    }
                }

                // Continue monitoring - schedule next poll
                setTimeout(poll, currentInterval);

            } catch (error) {
                console.error('Polling error:', error);
                consecutiveErrors++;
                consecutiveSuccesses = 0; // Reset success counter

                // Analyze error type
                const isRateLimit = error.message.includes('429') ||
                    error.message.includes('Too Many Requests') ||
                    error.message.includes('CORS');

                const isNetworkError = error.message.includes('fetch') ||
                    error.message.includes('Failed to fetch') ||
                    error.message.includes('NetworkError');

                if (isRateLimit) {
                    // Aggressive backoff for rate limiting
                    currentInterval = Math.min(
                        currentInterval * this.backoffMultiplier,
                        this.maxPollingInterval
                    );
                    console.log(`⚠️ Rate limit hit! Backing off to ${currentInterval}ms (${Math.round(currentInterval / 1000)}s)`);
                } else if (consecutiveErrors >= this.maxConsecutiveErrors) {
                    // Multiple consecutive errors - back off more conservatively
                    currentInterval = Math.min(
                        currentInterval * 1.5,
                        this.maxPollingInterval
                    );
                    console.log(`⚠️ ${consecutiveErrors} consecutive errors, backing off to ${currentInterval}ms`);
                }

                // Continue monitoring unless it's a fatal error
                const isFatalError = !isRateLimit && !isNetworkError && consecutiveErrors > 10;

                if (!isFatalError && isMonitoring) {
                    if (onStatusUpdate) {
                        const waitTime = Math.round(currentInterval / 1000);
                        let message;
                        if (isRateLimit) {
                            message = `Rate limited, waiting ${waitTime}s... (check #${pollingCount})`;
                        } else if (isNetworkError) {
                            message = `Network error, retrying in ${waitTime}s... (check #${pollingCount})`;
                        } else {
                            message = `Error occurred, retrying in ${waitTime}s... (check #${pollingCount})`;
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
                    // Fatal error - stop monitoring
                    console.error('💀 Fatal error, stopping monitoring:', error);
                    isMonitoring = false;
                    if (onError) {
                        onError(error);
                    }
                }
            }
        };

        // Start continuous polling
        console.log(`🚀 Starting continuous monitoring with ${this.basePollingInterval}ms base interval`);
        poll();

        // Return a function to stop monitoring if needed
        return () => {
            isMonitoring = false;
            console.log('🛑 Monitoring stopped by user');
        };
    }
}

// Export for use in other scripts
window.BitcoinAPIService = BitcoinAPIService;
