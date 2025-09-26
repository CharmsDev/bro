// Complete reset functionality
// Resets entire application state to initial condition
import { Storage } from '../storage/Storage.js';
import { UIResetHelper } from './UIResetHelper.js';

export class CompleteReset {
    constructor(appState) {
        this.appState = appState;
    }

    // Executes complete reset of application
    execute() {
        console.log('[CompleteReset] Starting complete reset');
        
        try {
            this.stopAllProcesses();
            this.resetAllDomains();
            this.resetGlobalState();
            this.clearAllData();
            UIResetHelper.performCompleteUIReset();
            
            console.log('[CompleteReset] Complete reset finished - Application reset to initial state');
            
        } catch (error) {
            console.error('[CompleteReset] Error during complete reset:', error);
            throw error;
        }
    }

    // Stop all running processes
    stopAllProcesses() {
        console.log('[CompleteReset] Stopping all processes');
        
        this.stopMining();
        this.stopMonitoring();
        
        console.log('[CompleteReset] All processes stopped');
    }

    // Reset all domains to initial state
    resetAllDomains() {
        console.log('[CompleteReset] Resetting all domains');
        
        // Use internal reset methods
        this.appState.walletDomain._resetState();
        this.appState.miningDomain._resetState();
        this.appState.transactionDomain._resetState();
        this.appState.broadcastDomain._resetState();
        this.appState.mintingDomain._resetState();
        this.appState.walletVisitDomain._resetState();
        
        console.log('[CompleteReset] All domains reset');
    }

    // Reset global application state
    resetGlobalState() {
        console.log('[CompleteReset] Resetting global state');
        
        // Reset step coordinator
        this.appState.stepCoordinator._resetState();
        
        // Preserve prover config (Custom Prover URL maintained)
        
        // Clear event listeners
        if (this.appState._clearAllListeners) {
            this.appState._clearAllListeners();
        }
        
        // Do not re-setup domain coordination immediately after reset
        // Prevents automatic step activation from residual events
        
        // Save reset state
        this.appState.saveCurrentStep();
        
        console.log('[CompleteReset] Global state reset');
    }

    // Clear all localStorage data (preserving Custom Prover URL)
    clearAllData() {
        console.log('[CompleteReset] Clearing ALL localStorage data (preserving only Custom Prover URL)');
        
        // Preserve Custom Prover URL before clearing
        let customProverUrl = null;
        try {
            const proverConfig = localStorage.getItem('bro_prover_config');
            if (proverConfig) {
                const config = JSON.parse(proverConfig);
                customProverUrl = config.customProverUrl;
                console.log('[CompleteReset] Preserved Custom Prover URL:', customProverUrl);
            }
        } catch (error) {
            console.warn('[CompleteReset] Error preserving prover config:', error);
        }
        
        // Clear all localStorage
        try {
            localStorage.clear();
            console.log('[CompleteReset] localStorage.clear() executed - ALL data removed');
        } catch (error) {
            console.error('[CompleteReset] Error clearing localStorage:', error);
        }
        
        // Restore Custom Prover URL if it existed
        if (customProverUrl) {
            try {
                localStorage.setItem('bro_prover_config', JSON.stringify({
                    customProverUrl: customProverUrl,
                    isCustomProverMode: !!customProverUrl
                }));
                console.log('[CompleteReset] Custom Prover URL restored');
            } catch (error) {
                console.warn('[CompleteReset] Error restoring prover config:', error);
            }
        }
        
        console.log('[CompleteReset] Complete localStorage cleanup finished');
    }

    // Stop mining process
    stopMining() {
        if (window.BitcoinMiner) {
            try {
                const miner = new window.BitcoinMiner();
                if (miner.isRunning) {
                    miner.stop();
                    console.log('[CompleteReset] Mining stopped');
                }
            } catch (error) {
                console.warn('[CompleteReset] Error stopping miner:', error);
            }
        }
    }

    // Stop UTXO monitoring
    stopMonitoring() {
        if (this.appState.walletDomain.isMonitoring) {
            this.appState.walletDomain.stopMonitoring();
            console.log('[CompleteReset] UTXO monitoring stopped');
        }
    }
}
