/**
 * Template Loader Module
 * Uses embedded template constant for reliable loading
 */

import { REQUEST_TEMPLATE } from './constants.js';

/**
 * Template loader for payload generation
 */
export class TemplateLoader {
    constructor() {
        this.cachedTemplate = null;
    }

    /**
     * Load payload template from embedded constant
     * @returns {Promise<Object>} The loaded template
     */
    async loadTemplate() {
        
        if (this.cachedTemplate) {
            return this.cachedTemplate;
        }
        
        try {
            this.cachedTemplate = REQUEST_TEMPLATE;
            return this.cachedTemplate;
        } catch (error) {
            console.error('❌ Failed to load template from constant:', error);
            throw new Error(`Template loading failed: ${error.message}`);
        }
    }

    /**
     * Clear cached template (useful for testing)
     */
    clearCache() {
        this.cachedTemplate = null;
    }
}

// Export singleton instance
export const templateLoader = new TemplateLoader();
export default templateLoader;
