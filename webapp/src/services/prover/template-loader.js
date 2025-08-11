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
        
        // Try Vite/ESM-friendly resolution first
        try {
            const esmUrl = new URL('../assets/payload/request.json', import.meta.url).href;
            candidates.push(esmUrl);
        } catch (_) {
            // ignore if import.meta.url is unavailable
        }
        
        // Add configured paths
        candidates.push(...PROVER_CONFIG.TEMPLATE_PATHS);
        
        return candidates;
    }

    /**
     * Fetch and validate template from URL
     * @private
     */
    async _fetchTemplate(url) {
        const resp = await fetch(url, { cache: 'no-cache' });
        const ct = resp.headers.get('content-type') || 'unknown';
        console.log(`   ↪ status=${resp.status} ${resp.statusText}, content-type=${ct}`);
        
        const text = await resp.text();
        const head = text.slice(0, 120).replace(/\n/g, ' ');
        console.log(`   ↪ first-bytes: "${head}"`);
        
        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        }
        
        // Guard: ensure not HTML
        if (head.startsWith('<!DOCTYPE') || head.startsWith('<html')) {
            throw new Error('Received HTML instead of JSON (likely 404 or dev server path)');
        }
        
        // Parse and return JSON
        return JSON.parse(text);
    }

    /**
     * Clear cached template (useful for testing)
     */
    clearCache() {
        this.cachedTemplate = null;
    }
}
