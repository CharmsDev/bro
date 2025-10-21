/**
 * WalletUtxoScanner - Scans all wallet addresses for available UTXOs
 * Filters out dust, fees, and ordinals to prevent asset destruction
 */

import { WalletService } from '../wallet/WalletService.js';
import BitcoinApiRouter from '../providers/bitcoin-api-router/bitcoin-api-router.js';

export class WalletUtxoScanner {
    constructor() {
        this.walletService = new WalletService();
        this.apiRouter = new BitcoinApiRouter();
        
        // Values to exclude to prevent asset destruction
        this.EXCLUDED_VALUES = [
            330,  // Taproot dust limit
            333,  // Turbomining spendable outputs
            546,  // Ordinals/Inscriptions/Runes minimum (Bitcoin dust limit)
            777,  // Special marker value
            1000, // Fee transactions
            10000 // Common Ordinals/Runes value (0.0001 BTC)
        ];
    }

    /**
     * Scan all wallet addresses for available UTXOs
     * Excludes dust, fees, and ordinals to prevent asset destruction
     * @returns {Promise<Object>} Scanned UTXOs organized by type
     */
    async scanAllWalletUtxos() {
        try {
            const addresses = this.walletService.getAllAddresses();
            
            if (!addresses || addresses.total === 0) {
                return {
                    recipient: [],
                    change: [],
                    total: 0,
                    totalValue: 0,
                    excludedCount: 0,
                    scannedAddresses: 0
                };
            }

            // [RJJ-TODO] TEMPORARY LIMIT: Only scan first 5 addresses to avoid rate limiting
            // TODO: Restore to scan all addresses (currently 12 recipient + 12 change = 24 total)
            const MAX_ADDRESSES_TO_SCAN = 5;
            const limitedRecipient = addresses.recipient.slice(0, MAX_ADDRESSES_TO_SCAN);
            const limitedChange = addresses.change.slice(0, Math.max(0, MAX_ADDRESSES_TO_SCAN - limitedRecipient.length));

            const results = {
                recipient: [],
                change: [],
                total: 0,
                totalValue: 0,
                excludedCount: 0,
                scannedAddresses: 0,
                errors: []
            };

            // Scan recipient addresses (chain 0) - SEQUENTIAL - LIMITED TO 5
            for (const addressData of limitedRecipient) {
                try {
                    const utxos = await this.scanAddressUtxos(addressData, 'recipient');
                    results.recipient.push(...utxos.filtered);
                    results.excludedCount += utxos.excluded;
                    results.scannedAddresses++;
                    
                    // Small delay to avoid rate limiting
                    await this.delay(100);
                } catch (error) {
                    results.errors.push({
                        address: addressData.address,
                        type: 'recipient',
                        error: error.message
                    });
                }
            }

            // Scan change addresses (chain 1) - SEQUENTIAL - LIMITED TO 5
            for (const addressData of limitedChange) {
                try {
                    const utxos = await this.scanAddressUtxos(addressData, 'change');
                    results.change.push(...utxos.filtered);
                    results.excludedCount += utxos.excluded;
                    results.scannedAddresses++;
                    
                    // Small delay to avoid rate limiting
                    await this.delay(100);
                } catch (error) {
                    results.errors.push({
                        address: addressData.address,
                        type: 'change',
                        error: error.message
                    });
                }
            }

            // Calculate totals and deduplicate UTXOs
            const allUtxos = [...results.recipient, ...results.change];
            
            // Deduplicate UTXOs by txid:vout
            const uniqueUtxos = [];
            const seen = new Set();
            
            for (const utxo of allUtxos) {
                const key = `${utxo.txid}:${utxo.vout}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueUtxos.push(utxo);
                }
            }
            
            results.total = uniqueUtxos.length;
            results.totalValue = uniqueUtxos.reduce((sum, utxo) => sum + Number(utxo.value), 0);
            
            results.recipient = uniqueUtxos.filter(utxo => utxo.addressType === 'recipient');
            results.change = uniqueUtxos.filter(utxo => utxo.addressType === 'change');
            
            return results;

        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Scan a specific address for UTXOs and filter them
     * @param {Object} addressData - Address data from wallet
     * @param {string} type - 'recipient' or 'change'
     * @returns {Promise<Object>} Filtered and excluded UTXOs
     */
    async scanAddressUtxos(addressData, type) {
        try {
            // Get UTXOs from API
            const rawUtxos = await this.apiRouter.getAddressUtxos(addressData.address);
            
            if (!rawUtxos || !Array.isArray(rawUtxos)) {
                return { filtered: [], excluded: 0 };
            }

            const filtered = [];
            let excluded = 0;

            for (const utxo of rawUtxos) {
                const value = Number(utxo.value) || 0;
                
                // Check if UTXO should be excluded
                if (this.shouldExcludeUtxo(value)) {
                    excluded++;
                    // Silently exclude protected assets
                    continue;
                }

                // Add enriched UTXO data
                const enrichedUtxo = {
                    ...utxo,
                    address: addressData.address,
                    addressType: type,
                    chain: addressData.chain,
                    addressIndex: addressData.addressIndex,
                    derivationPath: addressData.derivationPath,
                    privateKey: addressData.privateKey,
                    value: value,
                    confirmed: utxo.status?.confirmed || false,
                    blockHeight: utxo.status?.block_height || null,
                    scannedAt: new Date().toISOString()
                };

                filtered.push(enrichedUtxo);
            }

            return { filtered, excluded };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Check if a UTXO should be excluded based on value
     * Protects against destroying dust, fees, and ordinals
     * @param {number} value - UTXO value in satoshis
     * @returns {boolean} True if should be excluded
     */
    shouldExcludeUtxo(value) {
        return this.EXCLUDED_VALUES.includes(value);
    }

    /**
     * Get human-readable reason for UTXO exclusion
     * @param {number} value - UTXO value in satoshis
     * @returns {string} Exclusion reason
     */
    getExclusionReason(value) {
        switch (value) {
            case 330:
                return 'Taproot dust limit';
            case 333:
                return 'Turbomining spendable output';
            case 546:
                return 'Ordinals/Inscriptions/Runes (dust limit)';
            case 777:
                return 'Special marker value';
            case 1000:
                return 'Fee transaction';
            case 10000:
                return 'Common Ordinals/Runes value';
            default:
                return 'Protected asset';
        }
    }

    /**
     * Get UTXOs suitable for Turbomining (higher values)
     * @param {Array} utxos - All available UTXOs
     * @param {number} minValue - Minimum value threshold (default: 10000 sats)
     * @returns {Array} UTXOs suitable for Turbomining
     */
    getTurbominingUtxos(utxos, minValue = 10000) {
        return utxos.filter(utxo => utxo.value >= minValue)
                   .sort((a, b) => b.value - a.value); // Sort by value descending
    }

    /**
     * Simple delay utility for rate limiting
     * @param {number} ms - Milliseconds to delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Format UTXOs for display in UI
     * @param {Array} utxos - UTXOs to format
     * @returns {Array} Formatted UTXOs
     */
    formatUtxosForDisplay(utxos) {
        return utxos.map(utxo => ({
            id: `${utxo.txid}:${utxo.vout}`,
            txid: utxo.txid,
            vout: utxo.vout,
            value: utxo.value,
            formattedValue: `${utxo.value.toLocaleString()} sats`,
            address: utxo.address,
            addressType: utxo.addressType,
            confirmed: utxo.confirmed,
            blockHeight: utxo.blockHeight,
            age: utxo.blockHeight ? `Block ${utxo.blockHeight}` : 'Unconfirmed'
        }));
    }
}
