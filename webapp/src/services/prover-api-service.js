/**
 * ProverApiService (Clean Consolidated Version)
 * Now uses the consolidated PayloadGenerator directly for better performance
 */

import { PayloadGenerator } from './prover/payload-generator.js';
import { ProverApiClient } from './prover/api-client.js';
import { PayloadValidator } from './prover/payload-validator.js';

import { PayloadUtils } from './prover/payload-utils.js';

export class ProverApiService {
    constructor() {
        // Initialize the consolidated services directly
        this.payloadGenerator = new PayloadGenerator();
        this.apiClient = new ProverApiClient();
        
        // Maintain backward compatibility properties
        this.apiUrl = 'https://charms-prover-test.fly.dev/spells/prove';
        this.templatePath = '/src/assets/payload/request.json';
        this.wasmHash = '6c730a8c2525445acd8efecb8dae6549dc64ce78ef3c50631ee0dad9ab8f7618';
        this.payloadTemplate = null;
        this.mempoolBaseUrl = 'https://mempool.space/testnet4/api';
    }

    /**
     * Load payload template
     * @returns {Promise<Object>} The loaded template
     */
    async loadPayloadTemplate() {
        const template = await this.payloadGenerator.templateLoader.loadTemplate();
        this.payloadTemplate = template; // Cache for backward compatibility
        return template;
    }

    /**
     * Fetch raw transaction hex by txid from mempool.space (testnet4)
     * @param {string} txid - Transaction ID
     * @returns {Promise<string>} Raw transaction hex
     */
    async fetchTxHex(txid) {
        return this.payloadGenerator.mempoolClient.fetchTxHex(txid);
    }

    /**
     * Fetch transaction JSON data by txid
     * @param {string} txid - Transaction ID
     * @returns {Promise<Object>} Transaction JSON data
     */
    async fetchTxJson(txid) {
        return this.payloadGenerator.mempoolClient.fetchTxJson(txid);
    }

    /**
     * Generate complete payload for prover API
     * @param {Object} miningData - Mining data (for logging only)
     * @param {Object} proofData - Proof data
     * @param {Object} walletData - Wallet data
     * @returns {Promise<Object>} Generated payload
     */
    async generatePayload(miningData, proofData, walletData) {
        return this.payloadGenerator.generatePayload(miningData, proofData, walletData);
    }

    /**
     * Generate app_id from input UTXO using SHA256
     * @param {Object} miningData - Mining data containing inputTxid and inputVout
     * @returns {Promise<string>} Generated app_id hash
     */
    async generateAppId(miningData) {
        return PayloadUtils.generateAppId(miningData);
    }

    /**
     * Calculate mined amount based on difficulty and reward
     * @param {number} difficulty - Mining difficulty
     * @param {number} baseReward - Base reward amount (default 144.5)
     * @returns {number} Mined amount in smallest units
     */
    calculateMinedAmount(difficulty, baseReward = 144.5) {
        return PayloadUtils.calculateMinedAmount(difficulty, baseReward);
    }

    /**
     * Send payload to prover API
     * @param {Object} payload - The payload to send
     * @returns {Promise<*>} Response from prover API
     */
    async sendToProver(payload) {
        return this.apiClient.sendToProver(payload);
    }

    /**
     * Validate payload structure
     * @param {Object} payload - The payload to validate
     * @returns {boolean} True if valid
     */
    validatePayload(payload) {
        return PayloadValidator.validatePayload(payload);
    }



    /**
    getPayloadInfo(miningData) {
        return PayloadUtils.getPayloadInfo(miningData);
    }

    /**
     * Validate prover API response
     * @param {*} response - Response from prover API
     * @throws {Error} If validation fails
     */
    validateProverResponse(response) {
        return PayloadValidator.validateProverResponse(response);
    }
}
