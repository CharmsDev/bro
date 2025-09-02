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
     * Send payload to prover API with automatic retry mechanism
     * @param {Object} payload - The payload to send
     * @returns {Promise<*>} Response from prover API
     */
    async sendToProver(payload) {
        // Infinite retry with random delay between 2s and 20s for any error case
        const minDelayMs = 2000;
        const maxDelayMs = 20000;
        let attempt = 1;

        for (;;) {
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
                    const errorMessage = `Prover API error: ${response.status} ${response.statusText} - ${rawText}`;

                    // Retry on ALL HTTP errors. For 429, honor Retry-After if present.
                    if (response.status === 429) {
                        const retryAfterHeader = response.headers.get('retry-after');
                        const retryAfterMs = this._parseRetryAfter(retryAfterHeader, minDelayMs, attempt);
                        const delayMs = retryAfterHeader ? retryAfterMs : this._randomDelay(minDelayMs, maxDelayMs);
                        console.warn(`⚠️ Prover API attempt ${attempt} hit rate limit (429). Retry after ${Math.round(delayMs)}ms...`);
                        await this._delay(delayMs);
                        attempt++;
                        continue;
                    }

                    console.warn(`⚠️ Prover API attempt ${attempt} failed (${response.status}). Will retry.`, rawText);
                    await this._delay(this._randomDelay(minDelayMs, maxDelayMs));
                    attempt++;
                    continue;
                }

                let data;
                try {
                    data = JSON.parse(rawText);
                } catch (jsonError) {
                    // JSON parsing errors should be retried as they might be temporary
                    console.warn(`⚠️ Prover API attempt ${attempt} failed (JSON parse error), retrying...`);
                    await this._delay(this._randomDelay(minDelayMs, maxDelayMs));
                    attempt++;
                    continue;
                }

                // Validate response format
                try {
                    PayloadValidator.validateProverResponse(data);
                } catch (validationError) {
                    // Validation errors should be retried as they might be temporary
                    console.warn(`⚠️ Prover API attempt ${attempt} failed (validation error), retrying...`);
                    await this._delay(this._randomDelay(minDelayMs, maxDelayMs));
                    attempt++;
                    continue;
                }

                // Success - log if this was a retry
                if (attempt > 1) {
                    console.log(`✅ Prover API succeeded on attempt ${attempt}`);
                }
                
                return data;

            } catch (error) {
                // Network errors, timeouts, etc.
                if (this._isRetryableError(error)) {
                    console.warn(`⚠️ Prover API attempt ${attempt} failed (${error.message}), retrying...`);
                    await this._delay(this._randomDelay(minDelayMs, maxDelayMs));
                    attempt++;
                    continue;
                }
                
                console.error(`❌ Prover API failed after ${attempt} attempts:`, error);
                throw error;
            }
        }
    }

    /**
     * Calculate exponential backoff delay with jitter
     * @param {number} attempt - Current attempt number (1-based)
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {number} Delay in milliseconds
     */
    _calculateDelay(attempt, baseDelay) {
        // Exponential backoff: baseDelay * 2^(attempt-1) with jitter
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        // Add random jitter (±25%) to prevent thundering herd
        const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
        return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
    }

    /**
     * Check if an error is retryable
     * @param {Error} error - The error to check
     * @returns {boolean} True if the error should trigger a retry
     */
    _isRetryableError(error) {
        // Retry on network errors, timeouts, etc.
        return error.name === 'TypeError' || // Network errors
               error.name === 'AbortError' || // Request timeouts
               error.message.includes('fetch') || // Fetch-related errors
               error.message.includes('network') || // Network-related errors
               error.message.includes('timeout'); // Timeout errors
    }

    /**
     * Delay execution for specified milliseconds
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Fixed delay with small jitter around baseDelay (defaults to ~3s)
     */
    _calculateFixedDelay(baseDelay) {
        const jitter = baseDelay * 0.1 * (Math.random() - 0.5); // ±10%
        return Math.max(0, baseDelay + jitter);
    }

    /**
     * Random delay between min and max milliseconds
     * @param {number} minMs
     * @param {number} maxMs
     */
    _randomDelay(minMs, maxMs) {
        const span = Math.max(0, maxMs - minMs);
        return Math.floor(minMs + Math.random() * span);
    }

    /**
     * Parse Retry-After header into milliseconds. Supports seconds or HTTP-date.
     * Falls back to exponential backoff if header is invalid/missing.
     */
    _parseRetryAfter(headerValue, baseDelay, attempt) {
        if (!headerValue) return this._calculateFixedDelay(baseDelay);
        const seconds = Number(headerValue);
        if (!Number.isNaN(seconds)) return Math.max(0, seconds * 1000);
        const dateMs = Date.parse(headerValue);
        if (!Number.isNaN(dateMs)) {
            const diff = dateMs - Date.now();
            return Math.max(0, diff);
        }
        return this._calculateFixedDelay(baseDelay);
    }

    /**
     * Set custom API URL (useful for testing)
     * @param {string} url - New API URL
     */
    setApiUrl(url) {
        this.apiUrl = url;
    }
}
