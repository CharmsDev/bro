export class BitcoinAPIService {
    constructor() {
        this.baseUrl = 'https://mempool.space/testnet4/api';
        this.basePollingInterval = 20000;
        this.minPollingInterval = 15000;
        this.maxPollingInterval = 180000;
        this.backoffMultiplier = 2.0;
        this.recoveryMultiplier = 0.8;
        this.maxConsecutiveErrors = 3;
    }

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

    async getAddressUtxos(address) {
        try {
            const url = `${this.baseUrl}/address/${address}/utxo?t=${Date.now()}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching UTXOs:', error);
            throw error;
        }
    }

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

                if (onStatusUpdate) {
                    const intervalSec = Math.round(currentInterval / 1000);
                    onStatusUpdate({
                        status: 'checking',
                        message: `check #${pollingCount}, ${intervalSec}s interval`,
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
                    console.log(`Optimizing interval to ${currentInterval}ms after ${consecutiveSuccesses} successes`);
                }

                if (utxos && utxos.length > 0) {
                    const validUtxos = utxos.filter(utxo => utxo.value >= 10000);

                    if (validUtxos.length > 0) {
                        const utxo = validUtxos[0];
                        const formattedUtxo = {
                            txid: utxo.txid,
                            vout: utxo.vout,
                            amount: utxo.value,
                            scriptPubKey: '',
                            address: address,
                            confirmations: utxo.status?.confirmed ? utxo.status.block_height : 0
                        };

                        console.log('🎉 UTXO found! Stopping monitoring:', formattedUtxo);
                        isMonitoring = false;
                        if (onUtxoFound) {
                            onUtxoFound(formattedUtxo);
                        }
                        return;
                    }
                }

                setTimeout(poll, currentInterval);

            } catch (error) {
                console.error('Polling error:', error);
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
                    console.log(`⚠️ Rate limit hit! Backing off to ${currentInterval}ms (${Math.round(currentInterval / 1000)}s)`);
                } else if (consecutiveErrors >= this.maxConsecutiveErrors) {
                    currentInterval = Math.min(
                        currentInterval * 1.5,
                        this.maxPollingInterval
                    );
                    console.log(`⚠️ ${consecutiveErrors} consecutive errors, backing off to ${currentInterval}ms`);
                }

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
                    console.error('💀 Fatal error, stopping monitoring:', error);
                    isMonitoring = false;
                    if (onError) {
                        onError(error);
                    }
                }
            }
        };

        console.log(`🚀 Starting continuous monitoring with ${this.basePollingInterval}ms base interval`);
        poll();

        return () => {
            isMonitoring = false;
            console.log('🛑 Monitoring stopped by user');
        };
    }
}

window.BitcoinAPIService = BitcoinAPIService;
