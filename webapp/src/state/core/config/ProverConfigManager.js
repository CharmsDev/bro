/**
 * Prover Configuration Manager - Handles prover settings and persistence
 * Clean, focused module for prover configuration
 */
export class ProverConfigManager {
    constructor() {
        this.config = {
            isCustomProverMode: false,
            customProverUrl: ''
        };
        
        this.loadConfig();
    }

    /**
     * Load prover configuration from localStorage
     */
    loadConfig() {
        try {
            const stored = localStorage.getItem('bro_prover_config');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.config = { ...this.config, ...parsed };
            }
        } catch (error) {
            console.warn('[ProverConfigManager] Error loading config:', error);
        }
    }

    /**
     * Update prover configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
    }

    /**
     * Save configuration to localStorage
     */
    saveConfig() {
        try {
            localStorage.setItem('bro_prover_config', JSON.stringify(this.config));
        } catch (error) {
            console.warn('[ProverConfigManager] Failed to save prover config:', error);
        }
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Reset to default configuration
     */
    resetConfig() {
        this.config = {
            isCustomProverMode: false,
            customProverUrl: ''
        };
        this.saveConfig();
    }
}
