/**
 * Template Loader Module
 * Handles loading and caching of payload templates
 */

import { PROVER_CONFIG } from './config.js';

/**
 * Template loader for payload generation
 */
export class TemplateLoader {
    constructor() {
        this.cachedTemplate = null;
        // Embedded template as fallback for production builds
        this.embeddedTemplate = {
            "spell": {
                "version": 6,
                "apps": {
                    "$01": "t/7cf8ee7186e40f7bd91032d14967bca152df097f720dd6d84957a42ed65786ee/6c730a8c2525445acd8efecb8dae6549dc64ce78ef3c50631ee0dad9ab8f7618"
                },
                "private_inputs": {
                    "$01": {
                        "tx": "{{TX_HEX}}",
                        "tx_block_proof": "{{TX_BLOCK_PROOF}}"
                    }
                },
                "ins": [
                    {
                        "utxo_id": "{{INPUT_UTXO_ID}}",
                        "charms": {}
                    }
                ],
                "outs": [
                    {
                        "address": "{{RECIPIENT_ADDRESS}}",
                        "charms": {
                            "$01": "{{OUTPUT_AMOUNT}}"
                        }
                    }
                ]
            },
            "binaries": {
                "6c730a8c2525445acd8efecb8dae6549dc64ce78ef3c50631ee0dad9ab8f7618": "AGFzbQEAAAABywEcYAAAYAN/f38Bf2ACf38Bf2ABfwBgAn9/AGABfwF/YAR/f39/AGADf39/AGAEf39/fwF/YAZ/f39/f38Bf2AFf39/f38Bf2AGf39/f39/AGADf35+AGADf35+AX9gBX9/f39/AGAAAX9gB39/f39/f38Bf2AHf39/f39/fwBgCH9/f39/f39/AGACfn8BfmADfn9/AX9gAn5/AX9gBH98f38Bf2ADf3x/AX9gA35/fwBgCX9/f39/f35+fgBgAn9+AX9gBX9+fn5+AAK3AQUWd2FzaV9zbmFwc2hvdF9wcmV2aWV3MQhmZF93cml0ZQAIFndhc2lfc25hcHNob3RfcHJldmlldzEHZmRfcmVhZAAIFndhc2lfc25hcHNob3RfcHJldmlldzELZW52aXJvbl9nZXQAAhZ3YXNpX3NuYXBzaG90X3ByZXZpZXcxEWVudmlyb25fc2l6ZXNfZ2V0AAIWd2FzaV9zbmFwc2hvdF9wcmV2aWV3MQlwcm9jX2V4aXQAAwPpBOcEAAAEBwQGBAYHBAYEBAQEAwICAgICAgICAgICCAICAgkCAgoBAQQCAgIDAwMDAwMDAwMEBAQLBAcEBgMHAwMDBwIEBwICBwQEAgcEBAQEBAQHBAwMBAQEAQQDBQQNBAIFAwIEBAQCAQYHAgMHBAQGAgMEBAAABA4CBwQDAggCAw8DAAQEBwcCAwECAgICBwEJAgcFAgIBBAQEBAICBAIBAgQDEA4RBA4CBwEDAgQCAgICAQICAwQEBAMCAgQEAwICBgMDAwMDAgICBwIEAgICAgISBwQCAgIEBAQHAgIEAgIHDgQHBAcHBgQEBAUHAwMEAwICBQYCAgUCBQYCAgITAgEEAwMFBAQBBgQCAgICAgICAgEUAgIFAgQEBAIDBAQEDQMCAgIEBAIDBAQCAgIEBAQNAgQEBAcDBAIDBAQEDQMCAgQEBAMCAgIEBAQDBAQEAwQCBAcDBAQHAgIDBAQEDQwCBAMEAwECAgQFAgQEBA0CBAICAgICAhUCAhYXFgICGAQEBwUEAgMKBwcHAgICAgIBAgcHAxkLAQcFBRAHAgIDAgIBEAIOAgIGAgICAQICFQICAgEGAgICAgICAgIHBAIDBQUCBAQEAgQFBQUaAgIEBwIFBQQFBAUCAgIFBQUEAgIBAgIFAgMEBAICAQICAg4HBAIHBwcABAAHAgIDAQICBgYFBAYGAQICAAQDAgICCAQEAgoDAQECAgICBgECAgMDAgQEBAMCBAQEBAECAgQEDwAAAwMDBA8CAAgHAwcEBQIDBQUBAwMCAgQBAgICAwACBQMAAAUAAAEBAQICAgUCAgUBBQEbBAcBcAGUApQCBQMBABEGDgJ/AUGAgMAAC38AQQALB6IDDwZtZW1vcnkCAAZfc3RhcnQABgtfX21haW5fdm9pZACEASRydXN0c2VjcDI1NmsxX3YwXzEwXzBfY29udGV4dF9jcmVhdGUA6gMlcnVzdHNlY3AyNTZrMV92MF8xMF8wX2NvbnRleHRfZGVzdHJveQDsAzFydXN0c2VjcDI1NmsxX3YwXzEwXzBfZGVmYXVsdF9pbGxlZ2FsX2NhbGxiYWNrX2ZuAO0DL3J1c3RzZWNwMjU2azFfdjBfMTBfMF9kZWZhdWx0X2Vycm9yX2NhbGxiYWNrX2ZuAO4DF19fZXh0ZXJucmVmX3RhYmxlX2FsbG9jALYEGV9fZXh0ZXJucmVmX3RhYmxlX2RlYWxsb2MAuwQWX19leHRlcm5yZWZfZHJvcF9zbGljZQC8BBtfX2V4dGVybnJlZl9oZWFwX2xpdmVfY291bnQAvQQRX193YmluZGdlbl9tYWxsb2MAvgQSX193YmluZGdlbl9yZWFsbG9jAMAED19fd2JpbmRnZW5fZnJlZQDBBBRfX3diaW5kZ2VuX2V4bl9zdG9yZQDCBAmLBAEAQQELkwItRUhJJpEDkgOTA6oDsAO3A+8DowPwA00rggHjAbIB9gH3AfoB+wGAAoIChAKfBHiRAZUBogGYBJQEzAHNAc8B0gHTAdQB2wHhAZICkwKPApACvQOaArgDiwOoAqkCrAKyAs0CpAOsA60DvwO+A98DwAO0A/gDgQTBA5IEngS2A6AEGxkWIR8cHR4YFRcaNmpmwQE3ngHZAjH1Ap8BrgI4oQHcAt0CXl1gYmHlAl80jAGNAY4BjwGLAeoCrgG0AbUBswG2AbcBuAGTAcMBxAHgApsBnAGdAeQCuQG6AbsBvAH0Ar0BvwG+AcAB5wLoAukCwgH2AssBsALrAuwC7QLgAeYCpgKQAacCqgKrAqAC2QG3AroCuAK5ArsCxALVAcUCxwLIAskCrQKvAtoC2wK8Ar0CswK0ArUCtgK/AsACwQLCAsMCoQKiAqMCpAKlAuEC4gLjAp0CngKfAtUC2gHcAdYC3QHeAdEC0QHSAtMC1AK8A9cC2CLKAswCywLOAs8C0ALeAt8CvgKxApkC9wLxAvIC8wL0A5QDKaYDpwO7A+AD5wPmA+gDyQPlA+kD6wPxA/ID8wOABIIEogSjBKQEgwSEBIUEjASNBI4EsQSyBLMEmgSbBJwEhgSHBIgEiQSKBIsE9gOwBJAEpwSoBKkEqgSrBKwErQSuBK8EnQS6BO4D7QMKgOIS5wQCAAtRAQF/AkACQCOBgICAAEH46MGAAGooAgANACOBgICAAEH46MGAAGpBATYCABCFgICAABCEgYCAACEAEN2EgIAAIAANAQ8LAAsgABDUhICAAAAL"
            }
        };
    }

    /**
     * Load payload template with robust fallback strategy
     * @returns {Promise<Object>} The loaded template
     */
    async loadTemplate() {
        if (this.cachedTemplate) {
            return this.cachedTemplate;
        }

        console.log('📦 Loading payload template...');

        const candidates = this._buildCandidateUrls();
        console.log('🔎 Template URL candidates (in order):', candidates);

        let lastError = null;
        for (const url of candidates) {
            try {
                console.log(`➡️  Trying to fetch template: ${url}`);
                const template = await this._fetchTemplate(url);
                this.cachedTemplate = template;
                console.log('✅ Payload template loaded successfully from:', url);
                return this.cachedTemplate;
            } catch (err) {
                console.warn(`⚠️  Failed to load/parse template from ${url}:`, err.message);
                lastError = err;
            }
        }

        throw new Error(`Failed to load payload template from all candidates. Last error: ${lastError?.message}`);
    }

    /**
     * Build list of candidate URLs to try
     * @private
     */
    _buildCandidateUrls() {
        const candidates = [];
        
        // Log current execution context for debugging
        console.log('🔍 DEBUGGING TEMPLATE PATH RESOLUTION:');
        console.log('   📍 Current location (window.location):', window.location.href);
        console.log('   📍 Base URL:', window.location.origin);
        console.log('   📍 Pathname:', window.location.pathname);
        console.log('   📍 import.meta.url available:', typeof import.meta !== 'undefined' && import.meta.url);
        
        if (typeof import.meta !== 'undefined' && import.meta.url) {
            console.log('   📍 import.meta.url:', import.meta.url);
        }
        
        // Try Vite/ESM-friendly resolution first
        try {
            const esmUrl = new URL('../assets/payload/request.json', import.meta.url).href;
            console.log('   ✅ ESM URL resolved to:', esmUrl);
            candidates.push(esmUrl);
        } catch (err) {
            console.log('   ❌ ESM URL resolution failed:', err.message);
        }
        
        // Try relative to current page location
        try {
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
            const relativeUrl = new URL('assets/payload/request.json', baseUrl).href;
            console.log('   ✅ Relative to page URL:', relativeUrl);
            candidates.push(relativeUrl);
        } catch (err) {
            console.log('   ❌ Relative URL resolution failed:', err.message);
        }
        
        // Try absolute from origin
        try {
            const absoluteUrl = new URL('/assets/payload/request.json', window.location.origin).href;
            console.log('   ✅ Absolute from origin URL:', absoluteUrl);
            candidates.push(absoluteUrl);
        } catch (err) {
            console.log('   ❌ Absolute URL resolution failed:', err.message);
        }
        
        // Add configured paths with full URL resolution
        console.log('   📋 Adding configured template paths...');
        for (const path of PROVER_CONFIG.TEMPLATE_PATHS) {
            try {
                let resolvedUrl;
                if (path.startsWith('http://') || path.startsWith('https://')) {
                    resolvedUrl = path;
                } else if (path.startsWith('/')) {
                    resolvedUrl = new URL(path, window.location.origin).href;
                } else {
                    resolvedUrl = new URL(path, window.location.href).href;
                }
                console.log(`   ✅ Config path "${path}" resolved to: ${resolvedUrl}`);
                candidates.push(resolvedUrl);
            } catch (err) {
                console.log(`   ❌ Config path "${path}" resolution failed:`, err.message);
                // Still add the original path as fallback
                candidates.push(path);
            }
        }
        
        // Remove duplicates while preserving order
        const uniqueCandidates = [...new Set(candidates)];
        console.log('   🎯 Final unique candidates:', uniqueCandidates);
        
        return uniqueCandidates;
    }

    /**
     * Fetch and validate template from URL
     * @private
     */
    async _fetchTemplate(url) {
        console.log(`   🌐 Attempting fetch from: ${url}`);
        
        let resp;
        try {
            resp = await fetch(url, { 
                cache: 'no-cache',
                headers: {
                    'Accept': 'application/json, text/plain, */*'
                }
            });
        } catch (fetchError) {
            console.log(`   ❌ Fetch failed with network error:`, fetchError.message);
            throw new Error(`Network error: ${fetchError.message}`);
        }
        
        const ct = resp.headers.get('content-type') || 'unknown';
        const cacheControl = resp.headers.get('cache-control') || 'none';
        const server = resp.headers.get('server') || 'unknown';
        
        console.log(`   ↪ Response details:`);
        console.log(`     • Status: ${resp.status} ${resp.statusText}`);
        console.log(`     • Content-Type: ${ct}`);
        console.log(`     • Cache-Control: ${cacheControl}`);
        console.log(`     • Server: ${server}`);
        console.log(`     • URL after redirects: ${resp.url}`);
        
        let text;
        try {
            text = await resp.text();
        } catch (textError) {
            console.log(`   ❌ Failed to read response body:`, textError.message);
            throw new Error(`Failed to read response: ${textError.message}`);
        }
        
        const head = text.slice(0, 200).replace(/\n/g, ' ').replace(/\s+/g, ' ');
        console.log(`   ↪ Response body preview (${text.length} chars): "${head}${text.length > 200 ? '...' : ''}"`);
        
        if (!resp.ok) {
            console.log(`   ❌ HTTP error response (${resp.status})`);
            throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        }
        
        // Guard: ensure not HTML (common when path doesn't exist and server returns 404 page)
        const trimmedText = text.trim();
        if (trimmedText.startsWith('<!DOCTYPE') || trimmedText.startsWith('<html') || trimmedText.includes('<title>')) {
            console.log(`   ❌ Received HTML instead of JSON - likely 404 or wrong path`);
            throw new Error('Received HTML instead of JSON (likely 404 or dev server path)');
        }
        
        // Validate JSON structure
        let parsedJson;
        try {
            parsedJson = JSON.parse(text);
            console.log(`   ✅ JSON parsed successfully. Keys:`, Object.keys(parsedJson));
        } catch (parseError) {
            console.log(`   ❌ JSON parse failed:`, parseError.message);
            console.log(`   ↪ Raw text (first 500 chars):`, text.slice(0, 500));
            throw new Error(`Invalid JSON: ${parseError.message}`);
        }
        
        return parsedJson;
    }

    /**
     * Clear cached template (useful for testing)
     */
    clearCache() {
        this.cachedTemplate = null;
    }
}
