/**
 * Mempool API Client Module
 * Handles all interactions with mempool.space API
 */

import { PROVER_CONFIG } from './config.js';

export class MempoolClient {
    constructor() {
        this.baseUrl = PROVER_CONFIG.MEMPOOL_BASE_URL;
    }

    /**
     * Fetch raw transaction hex by txid
     * @param {string} txid - Transaction ID
     * @returns {Promise<string>} Raw transaction hex
     */
    async fetchTxHex(txid) {
        const url = `${this.baseUrl}/tx/${txid}/hex`;
        console.log('🔎 Fetching raw tx hex:', url);
        
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Failed to fetch tx hex: ${res.status} ${res.statusText}`);
        }
        
        const text = await res.text();
        if (!/^[0-9a-fA-F]+$/.test(text)) {
            throw new Error('Fetched tx hex is not valid hex');
        }
        
        return text.trim();
    }

    /**
     * Fetch transaction JSON data by txid
     * @param {string} txid - Transaction ID
     * @returns {Promise<Object>} Transaction JSON data
     */
    async fetchTxJson(txid) {
        const url = `${this.baseUrl}/tx/${txid}`;
        console.log('🔎 Fetching tx JSON:', url);
        
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Failed to fetch tx JSON: ${res.status} ${res.statusText}`);
        }
        
        return res.json();
    }

    /**
     * Set custom mempool base URL (useful for testing)
     * @param {string} url - New base URL
     */
    setBaseUrl(url) {
        this.baseUrl = url;
    }
}
