import { environmentConfig } from '../config/environment.js';
import { QuickNodeClient } from './providers/quicknode/index.js';

export class BitcoinAPIService {
    constructor() {
        // QuickNode RPC client with Blockbook add-on for complete Bitcoin operations
        this.client = new QuickNodeClient();
        this.basePollingInterval = 20000;
        this.minPollingInterval = 15000;
        this.maxPollingInterval = 180000;
        this.backoffMultiplier = 2.0;
        this.recoveryMultiplier = 0.8;
        this.maxConsecutiveErrors = 3;
    }

    async getAddressInfo(address) {
        try {
            const info = await this.client.getAddressInfo(address);
            return info;
        } catch (error) {
            throw error;
        }
    }

    async getAddressUtxos(address) {
        try {
            const addressInfo = await this.client.getAddressInfo(address);
            console.log('[BitcoinAPI] getAddressUtxos: fetched addressInfo, txids:', Array.isArray(addressInfo?.txids) ? addressInfo.txids.length : 0);

            if (!addressInfo || !addressInfo.txids || addressInfo.txids.length === 0) {
                return [];
            }

            const utxos = [];
            
            for (const txid of addressInfo.txids) {
                try {
                    const tx = await this.client.getRawTransaction(txid, true);
                    
                    let matchesInTx = 0;
                    tx.vout.forEach((output, index) => {
                        const spk = output?.scriptPubKey || {};
                        const hasAddressesArray = Array.isArray(spk.addresses) && spk.addresses.includes(address);
                        const hasSingleAddress = typeof spk.address === 'string' && spk.address === address; // common for Taproot
                        if (hasAddressesArray || hasSingleAddress) {
                            matchesInTx++;
                            utxos.push({
                                txid: txid,
                                vout: index,
                                value: Math.round(Number(output.value) * 100000000),
                                confirmed: (tx.confirmations || 0) > 0
                            });
                        }
                    });
                    if (matchesInTx === 0) {
                        console.log('[BitcoinAPI] getAddressUtxos: no matching outputs in tx', txid);
                    }
                } catch (txError) {
                    // Skip failed transactions
                    console.warn('[BitcoinAPI] getAddressUtxos: failed to fetch/parse tx', txid);
                }
            }
            
            return utxos;
        } catch (error) {
            console.error('[BitcoinAPI] getAddressUtxos: error', error?.message || error);
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
                }

                if (utxos && utxos.length > 0) {
                    const validUtxos = utxos.filter(utxo => parseInt(utxo.value) >= 5000);

                    if (validUtxos.length > 0) {
                        const utxo = validUtxos[0];
                        const formattedUtxo = {
                            txid: utxo.txid,
                            vout: utxo.vout,
                            value: parseInt(utxo.value), // Use 'value' instead of 'amount'
                            amount: parseInt(utxo.value), // Keep both for compatibility
                            scriptPubKey: '',
                            address: address,
                            confirmations: utxo.confirmations || 0
                        };

                        isMonitoring = false;
                        console.log('✅ [BitcoinAPI] monitorAddress: valid UTXO found and formatted:', formattedUtxo);
                        if (onUtxoFound) {
                            onUtxoFound(formattedUtxo);
                        }
                        return;
                    }
                    console.log(`[BitcoinAPI] monitorAddress: ${utxos.length} utxos, but 0 valid above threshold`);
                }
                if (!utxos || utxos.length === 0) {
                    console.log('[BitcoinAPI] monitorAddress: no utxos found for address yet');
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
                    isMonitoring = false;
                    if (onError) {
                        onError(error);
                    }
                }
            }
        };

        poll();

        return () => {
            isMonitoring = false;
        };
    }
}

window.BitcoinAPIService = BitcoinAPIService;
