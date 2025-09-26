/**
 * Reset Manager - Coordinates reset operations
 * Updated to work with new modular AppState architecture
 */
import { CompleteReset } from './CompleteReset.js';
import { PartialReset } from './PartialReset.js';

export class ResetManager {
    constructor(appState) {
        this.appState = appState;
        this.completeResetHandler = new CompleteReset(appState);
        this.partialResetHandler = new PartialReset(appState);
    }

    /**
     * Perform complete reset (Reset All)
     */
    completeReset() {
        console.log('[ResetManager] Initiating complete reset');
        
        try {
            this.completeResetHandler.execute();
            
            // Emit reset event for UI updates
            this.appState.emit('completeResetCompleted');
            
            console.log('[ResetManager] Complete reset successful');
            
        } catch (error) {
            console.error('[ResetManager] Complete reset failed:', error);
            throw error;
        }
    }

    /**
     * Perform partial reset (Mint More)
     */
    async partialReset() {
        console.log('[ResetManager] Initiating partial reset');
        
        try {
            await this.partialResetHandler.execute();
            
            // Emit reset event for UI updates
            this.appState.emit('partialResetCompleted');
            
            console.log('[ResetManager] Partial reset successful');
            
        } catch (error) {
            console.error('[ResetManager] Partial reset failed:', error);
            throw error;
        }
    }

    /**
     * Check if reset is needed based on state
     */
    isResetNeeded() {
        // Check for stale data or inconsistent state
        try {
            const transactionData = localStorage.getItem('bro_transaction_data');
            if (transactionData) {
                const parsed = JSON.parse(transactionData);
                const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
                const now = Date.now();
                
                return parsed.timestamp && (now - parsed.timestamp) > staleThreshold;
            }
        } catch (error) {
            return true; // Reset if data is corrupted
        }
        
        return false;
    }

    /**
     * Auto-reset if needed
     */
    autoResetIfNeeded() {
        if (this.isResetNeeded()) {
            console.log('[ResetManager] Auto-reset triggered due to stale data');
            this.completeReset();
            return true;
        }
        return false;
    }
}
