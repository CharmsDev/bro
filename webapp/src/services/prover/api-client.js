/**
 * API Client Module
 * Handles communication with the prover API
 */

import { PROVER_CONFIG } from './config.js';
import { PayloadValidator } from './payload-validator.js';

export class ProverApiClient {
    constructor() {
        this.apiUrl = PROVER_CONFIG.API_URL;
    }

    /**
     * Send payload to prover API
     * @param {Object} payload - The payload to send
     * @returns {Promise<*>} Response from prover API
     */
    async sendToProver(payload) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const contentType = response.headers.get('content-type') || 'unknown';
            const rawText = await response.text();

            if (!response.ok) {
                console.error('❌ Prover API error response:', rawText);
                throw new Error(`Prover API error: ${response.status} ${response.statusText} - ${rawText}`);
            }

            let data;
            try {
                data = JSON.parse(rawText);
            } catch (jsonError) {
                console.error('❌ Error parsing JSON response (success status):', jsonError.message);
                throw new Error(`Invalid JSON success response from prover API: ${rawText}`);
            }

            // Validate response format
            PayloadValidator.validateProverResponse(data);

            return data;

        } catch (error) {
            console.error('❌ Error sending to prover API:', error);
            throw error;
        }
    }

    /**
     * Set custom API URL (useful for testing)
     * @param {string} url - New API URL
     */
    setApiUrl(url) {
        this.apiUrl = url;
    }
}
