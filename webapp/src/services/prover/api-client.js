// Prover API client with automatic retry mechanism
import { PROVER_CONFIG } from './config.js';
import { PayloadValidator } from './payload-validator.js';

// Handles communication with prover API including retry logic
export class ProverApiClient {
    constructor() {
        this.apiUrl = PROVER_CONFIG.API_URL;
        // Enable logging for retry visibility
        this.enableLogging = true;
    }

    // Send payload to prover API with automatic retry mechanism
    async sendToProver(payload, onStatus) {
        // Retry on HTTP 5xx AND network errors. No retries for 4xx, JSON/validation errors.
        const baseDelayMs = 3000; // Start with 3 seconds
        const maxDelayMs = 30000; // Cap at 30 seconds
        let attempt = 1;

        for (;;) {
            try {
                // Notify start of attempt
                if (typeof onStatus === 'function') {
                    try { onStatus({ phase: 'start', attempt }); } catch {}
                }

                // Decide URL at call time: check what's actually in the input box
                let urlToUse = this.apiUrl; // default from environment
                
                // Check the actual input field value
                const customProverUrlInput = document.getElementById('customProverUrl');
                if (customProverUrlInput && customProverUrlInput.value.trim()) {
                    const inputUrl = customProverUrlInput.value.trim();
                    // Always use the custom URL, even if it's invalid
                    urlToUse = inputUrl;
                    try {
                        new URL(inputUrl);
                    } catch {
                    }
                }
                
                console.log('[ProverApiClient] 🎯 Using prover URL:', urlToUse);

                const response = await fetch(urlToUse, {
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
                    // Retry on 5xx server errors
                    if (response.status >= 500) {
                        if (this.enableLogging) {
                            console.warn(`⚠️ Prover API attempt ${attempt} failed with ${response.status}. Retrying...`);
                        }
                        const nextDelay = this._calculateProgressiveDelay(attempt, baseDelayMs);
                        if (typeof onStatus === 'function') {
                            try { onStatus({ phase: 'retrying', attempt, statusCode: response.status, rawText, nextDelayMs: nextDelay }); } catch {}
                        }
                        await this._delay(nextDelay);
                        attempt++;
                        continue;
                    }

                    // For 4xx (including 429) do NOT retry; fail immediately
                    if (this.enableLogging) {
                        console.error(`❌ Prover API returned non-retryable error (${response.status}). Aborting.`, rawText);
                    }
                    throw new Error(errorMessage);
                }

                let data;
                try {
                    data = JSON.parse(rawText);
                } catch (jsonError) {
                    // Do NOT retry JSON parsing errors
                    if (this.enableLogging) {
                        console.error(`❌ Prover API JSON parse error on attempt ${attempt}. Aborting.`);
                    }
                    throw jsonError;
                }

                // Validate response format
                try {
                    PayloadValidator.validateProverResponse(data);
                } catch (validationError) {
                    // Do NOT retry validation errors; abort
                    if (this.enableLogging) {
                        console.error(`❌ Prover API validation error on attempt ${attempt}. Aborting.`);
                    }
                    throw validationError;
                }

                // Success - log if this was a retry
                if (typeof onStatus === 'function') {
                    try { onStatus({ phase: 'success', attempt }); } catch {}
                }
                if (this.enableLogging && attempt > 1) {
                    console.log(`✅ Prover API succeeded on attempt ${attempt}`);
                }
                
                return data;

            } catch (error) {
                // Check if this is a retryable network error
                if (this._isRetryableNetworkError(error)) {
                    if (this.enableLogging) {
                        console.warn(`⚠️ Network error on attempt ${attempt}: ${error.message}. Retrying...`);
                    }
                    const nextDelay = this._calculateProgressiveDelay(attempt, baseDelayMs);
                    if (typeof onStatus === 'function') {
                        try { onStatus({ phase: 'retrying', attempt, statusCode: 'NETWORK_ERROR', rawText: error.message, nextDelayMs: nextDelay }); } catch {}
                    }
                    await this._delay(nextDelay);
                    attempt++;
                    continue;
                }
                
                // Non-retryable error (JSON parsing, validation, etc.)
                if (this.enableLogging) {
                    console.error(`❌ Prover API non-retryable error on attempt ${attempt}:`, error);
                }
                throw error;
            }
        }
    }

    // Calculate exponential backoff delay with jitter
    _calculateDelay(attempt, baseDelay) {
        // Exponential backoff: baseDelay * 2^(attempt-1) with jitter
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        // Add random jitter (±25%) to prevent thundering herd
        const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
        return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
    }

    // Check if error is retryable network error
    _isRetryableNetworkError(error) {
        // Retry on network errors, timeouts, CORS, etc.
        return error.name === 'TypeError' || // Network errors (Failed to fetch)
               error.name === 'AbortError' || // Request timeouts
               error.message.includes('fetch') || // Fetch-related errors
               error.message.includes('network') || // Network-related errors
               error.message.includes('timeout') || // Timeout errors
               error.message.includes('CORS') || // CORS errors
               error.message.includes('ERR_NETWORK') || // Network errors
               error.message.includes('ERR_INTERNET_DISCONNECTED'); // Connection errors
    }

    // Calculate progressive delay with increasing intervals
    _calculateProgressiveDelay(attempt, baseDelay) {
        const delays = [3000, 10000, 15000, 20000, 25000, 30000]; // Progressive delays
        const delayIndex = Math.min(attempt - 1, delays.length - 1);
        const baseDelayMs = delays[delayIndex];
        
        // Add small jitter (±10%) to prevent thundering herd
        const jitter = baseDelayMs * 0.1 * (Math.random() - 0.5);
        return Math.max(1000, baseDelayMs + jitter); // Minimum 1 second
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
