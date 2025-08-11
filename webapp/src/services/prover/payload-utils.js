/**
 * Payload Utilities Module
 * Helper functions for payload generation and calculations
 */

import { PROVER_CONFIG } from './config.js';

export class PayloadUtils {
    /**
     * Generate app_id from mining transaction UTXO using SHA256
     * @param {Object} miningData - Mining data containing txid (mining transaction)
     * @returns {Promise<string>} Generated app_id hash
     */
    static async generateAppId(miningData) {
        // Use MINING transaction ID with vout 1 (the token output)
        const appUtxo = `${miningData.txid}:1`;

        const encoder = new TextEncoder();
        const data = encoder.encode(appUtxo);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = new Uint8Array(hashBuffer);
        const hashHex = Array.from(hashArray)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        console.log(`📝 Generated app_id: ${hashHex} from MINING UTXO: ${appUtxo}`);
        return hashHex;
    }

    /**
     * Calculate mined amount based on difficulty and reward
     * @param {number} difficulty - Mining difficulty
     * @param {number} baseReward - Base reward amount (default from config)
     * @returns {number} Mined amount in smallest units
     */
    static calculateMinedAmount(difficulty, baseReward = PROVER_CONFIG.DEFAULT_BASE_REWARD) {
        // Convert to smallest unit (equivalent to satoshis)
        // Use the actual reward from the mining calculation
        const broTokens = baseReward;
        const smallestUnit = broTokens * Math.pow(10, PROVER_CONFIG.DECIMAL_PLACES);

        console.log(`💰 Calculated mined amount: ${broTokens} BRO (${smallestUnit} smallest units)`);
        return smallestUnit;
    }

    /**
     * Get payload size information
     * @param {Object} payload - The payload object
     * @returns {Object} Size information breakdown
     */
    static getPayloadInfo(payload) {
        const jsonString = JSON.stringify(payload);
        const totalSize = jsonString.length;

        // Calculate WASM binary size
        let wasmSize = 0;
        for (const hash in payload.binaries) {
            wasmSize += payload.binaries[hash].length;
        }

        return {
            totalSize,
            totalSizeKB: Math.round(totalSize / 1024),
            wasmSize,
            wasmSizeKB: Math.round(wasmSize * 0.75 / 1024), // Base64 to binary conversion
            jsonSize: totalSize - wasmSize,
            jsonSizeKB: Math.round((totalSize - wasmSize) / 1024)
        };
    }

    /**
     * Load mining data from localStorage
     * @returns {Object|null} Mining data from localStorage or null if not found
     */
    static loadMiningDataFromStorage() {
        try {
            const raw = (typeof localStorage !== 'undefined') 
                ? localStorage.getItem(PROVER_CONFIG.STORAGE_KEYS.TRANSACTION_DATA) 
                : null;
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.warn('Could not read/parse bro_transaction_data from localStorage:', e.message);
            return null;
        }
    }

    /**
     * Resolve wallet address from walletData or localStorage
     * @param {Object} walletData - Provided wallet data
     * @returns {string|null} Resolved wallet address
     */
    static resolveWalletAddress(walletData) {
        // Try provided walletData first
        let resolvedAddress = walletData && typeof walletData.address === 'string' 
            ? walletData.address 
            : null;

        // Fallback to localStorage
        if (!resolvedAddress) {
            try {
                const persisted = localStorage.getItem(PROVER_CONFIG.STORAGE_KEYS.WALLET_DATA);
                if (persisted) {
                    const parsed = JSON.parse(persisted);
                    if (parsed && typeof parsed.address === 'string') {
                        resolvedAddress = parsed.address;
                    }
                }
            } catch (e) {
                console.warn('Could not read bro_wallet_data from localStorage:', e.message);
            }
        }

        if (!resolvedAddress) {
            console.warn('Wallet address unresolved; change_address may fail validation');
        }

        return resolvedAddress;
    }

    /**
     * Log localStorage contents safely for debugging
     */
    static logLocalStorageDebug() {
        try {
            const lsKeys = Object.keys(localStorage || {}).filter(k => 
                typeof localStorage.getItem === 'function'
            );
            const lsDump = {};
            for (const k of lsKeys) {
                try { 
                    lsDump[k] = localStorage.getItem(k); 
                } catch (e) { 
                    /* ignore */ 
                }
            }
            console.log('💾 localStorage dump (safe):', lsDump);
        } catch (_) { 
            /* non-browser context */ 
        }
    }
}
