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

        return hashHex;
    }

    /**
     * Calculates the mined amount in the smallest unit based on the token reward.
     * @param {number} reward - The reward amount in BRO tokens.
     * @returns {number} The mined amount in the smallest unit.
     */
    static calculateMinedAmount(reward) {
        if (typeof reward !== 'number') {
            return 0;
        }
        // Convert to smallest unit (equivalent to satoshis)
        return reward * Math.pow(10, PROVER_CONFIG.DECIMAL_PLACES);
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
            // Silently fail if localStorage is not available or data is corrupt
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
                // Silently fail on parsing error
            }
        }


        return resolvedAddress;
    }

}
