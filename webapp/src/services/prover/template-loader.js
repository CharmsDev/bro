/**
 * Template Loader Module
 * Handles loading and caching of payload templates
 */

import { PROVER_CONFIG } from './config.js';

export class TemplateLoader {
    constructor() {
        this.cachedTemplate = null;
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
