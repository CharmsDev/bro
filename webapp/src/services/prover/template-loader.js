/**
 * Template Loader Module
 * Uses embedded template constant for reliable loading
 */

import { REQUEST_TEMPLATE } from '../config/constants.js';

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
        console.log('🎯 Loading template from embedded constant');
        
        if (this.cachedTemplate) {
            console.log('✅ Using cached template');
            return this.cachedTemplate;
        }
        
        try {
            this.cachedTemplate = REQUEST_TEMPLATE;
            console.log('✅ Template loaded successfully from constant');
            console.log('📊 Template keys:', Object.keys(this.cachedTemplate));
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
        console.log('🧹 Template cache cleared');
    }
}

// Export singleton instance
export const templateLoader = new TemplateLoader();
export default templateLoader;
