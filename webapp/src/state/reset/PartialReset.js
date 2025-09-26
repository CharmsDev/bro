// Partial reset functionality for "Mint More" feature
// Preserves wallet data while resetting minting process
import { Storage } from '../storage/Storage.js';
import { UIResetHelper } from './UIResetHelper.js';

export class PartialReset {
    constructor(appState) {
        this.appState = appState;
    }

    // Executes partial reset for new minting cycle
    async execute() {
        console.log('[PartialReset] Starting partial reset (Mint More)');
        
        // Log localStorage state before reset
        this.logLocalStorageState('BEFORE PARTIAL RESET');
        
        try {
            console.log('[PartialReset] 🔧 STEP 1: Preserving wallet and prover data');
            const preservedData = this.preserveWalletAndProverData();
            
            console.log('[PartialReset] 🔧 STEP 2: Resetting minting domains');
            this.resetMintingDomains();
            
            console.log('[PartialReset] 🔧 STEP 3: Restoring preserved data');
            await this.restorePreservedData(preservedData);
            
            console.log('[PartialReset] 🔧 STEP 4: Resetting global state to Step 1');
            this.resetGlobalState();
            
            console.log('[PartialReset] 🔧 STEP 5: Clearing minting localStorage data');
            this.clearMintingData();
            
            console.log('[PartialReset] 🔧 STEP 6: Stopping minting processes');
            this.stopMintingProcesses();
            
            console.log('[PartialReset] 🔧 STEP 7: Performing UI reset');
            UIResetHelper.performPartialUIReset(true);
            
            // Start fresh UTXO monitoring
            this.startFreshUTXOMonitoring();
            
            // Log localStorage state after reset
            this.logLocalStorageState('AFTER PARTIAL RESET');
            
            console.log('[PartialReset] Partial reset finished - Ready for new minting cycle');
            
        } catch (error) {
            console.error('[PartialReset] Error during partial reset:', error);
            throw error;
        }
    }

    // Preserve wallet and prover configuration (NO UTXOs)
    preserveWalletAndProverData() {
        console.log('[PartialReset] Preserving wallet and prover data (UTXOs will be cleared)');
        
        return {
            wallet: this.appState.walletDomain.wallet,
            // UTXOs not preserved - start fresh monitoring
            proverConfig: { ...this.appState.proverConfig }
        };
    }

    // Reset all minting-related domains (preserve wallet)
    resetMintingDomains() {
        console.log('[PartialReset] Resetting minting-related domains (2-6)');
        
        // Reset domains using internal methods
        this.appState.miningDomain._resetState();
        this.appState.transactionDomain._resetState();
        this.appState.broadcastDomain._resetState();
        this.appState.mintingDomain._resetState();
        this.appState.walletVisitDomain._resetState();
        
        // Reset wallet domain monitoring
        this.appState.walletDomain.stopMonitoring();
        
        console.log('[PartialReset] Minting domains reset');
    }

    // Restore preserved wallet data (NO UTXOs)
    async restorePreservedData(preservedData) {
        console.log('[PartialReset] Restoring preserved data (wallet only, no UTXOs)');
        
        if (preservedData.wallet) {
            this.appState.walletDomain.wallet = preservedData.wallet;
        }
        
        // Clear existing UTXO data for fresh monitoring
        this.appState.walletDomain.utxo = null;
        
        if (preservedData.proverConfig) {
            this.appState.proverConfig = preservedData.proverConfig;
        }
        
        // Update storage - Step 1 not completed, needs fresh monitoring
        const { Storage } = await import('../storage/Storage.js');
        Storage.updateStep(1, {
            isActive: true,
            isCompleted: false,  // Step 1 not completed
            wallet: preservedData.wallet
            // No UTXO data - start fresh
        });
        
        console.log('[PartialReset] Preserved data restored (wallet only)');
    }

    // Reset global step state
    resetGlobalState() {
        console.log('[PartialReset] Resetting global state');
        
        // Reset to step 1 for fresh monitoring cycle
        this.appState.stepCoordinator._resetState(1, []);
        
        // Clear minting result from global state
        if (this.appState.global && this.appState.global.mintingResult) {
            delete this.appState.global.mintingResult;
            console.log('[PartialReset] 🔧 Cleared mintingResult from global state');
        }
        
        // Clear all minting-related data from Storage system
        this.clearMintingDataFromStorage();
        
        this.appState.saveCurrentStep();
        
        console.log('[PartialReset] Global state reset to step 1');
    }

    // Clear minting-related data from Storage system
    async clearMintingDataFromStorage() {
        const { Storage } = await import('../storage/Storage.js');
        
        // Reset steps 2-6 to default state
        Storage.updateStep(2, {
            isActive: false,
            isCompleted: false,
            data: {
                miningResult: null,
                miningProgress: null,
                isRunning: false,
                mode: 'cpu'
            }
        });
        
        Storage.updateStep(3, {
            isActive: false,
            isCompleted: false,
            data: {
                transaction: null
            }
        });
        
        Storage.updateStep(4, {
            isActive: false,
            isCompleted: false,
            data: {
                broadcastResult: null
            }
        });
        
        Storage.updateStep(5, {
            isActive: false,
            isCompleted: false,
            data: {
                signedTransactions: null,
                mintingResult: null
            }
        });
        
        Storage.updateStep(6, {
            isActive: false,
            isCompleted: false,
            data: {
                walletVisitEnabled: false
            }
        });
        
        // Clear global minting data
        Storage.updateGlobal({
            currentStep: 1,
            completedSteps: [],
            mintingResult: null
        });
        
        console.log('[PartialReset] 🔧 Cleared all minting data from Storage system');
    }

    // Clear minting-related localStorage data
    clearMintingData() {
        console.log('[PartialReset] Clearing minting localStorage data');
        
        const keysToRemove = [
            // Mining data
            'miningProgress',
            'miningResult', 
            'bestHash11',
            'bestNonce11',
            'bestLeadingZeros11',
            
            // Transaction and broadcast data
            'bro_transaction_data',
            'bro_broadcast_data',
            'bro_signed_transactions',
            
            // Minting data
            'bro_minting_progress',
            'bro_minting_result',
            
            // Step data
            'bro_current_step',
            'bro_completed_steps',
            
            // Additional minting keys
            'bro_utxo_display_data',
            'bro_utxo_data',
            'bro_utxo_list'
            
            // Preserved keys: charmsWallet, bro_prover_config
        ];
        
        keysToRemove.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.warn(`[PartialReset] Failed to remove ${key}:`, error);
            }
        });
        
        console.log('[PartialReset] Minting data cleared');
    }

    // Stop any running minting processes
    stopMintingProcesses() {
        console.log('[PartialReset] Stopping minting processes');
        
        // Stop mining if running
        if (window.BitcoinMiner) {
            try {
                const miner = new window.BitcoinMiner();
                if (miner.isRunning) {
                    miner.stop();
                    console.log('[PartialReset] Mining stopped');
                }
            } catch (error) {
                console.warn('[PartialReset] Error stopping miner:', error);
            }
        }
        
        console.log('[PartialReset] Minting processes stopped');
    }

    // Start fresh UTXO monitoring after reset
    startFreshUTXOMonitoring() {
        console.log('[PartialReset] Starting fresh UTXO monitoring for Step 1');
        
        try {
            // Start monitoring if wallet exists
            if (this.appState.walletDomain.wallet) {
                // Reset wallet domain UTXO for fresh monitoring
                this.appState.walletDomain.utxo = null;
                
                // Get wallet manager to start monitoring
                const walletManager = window.appController?.modules?.walletManager;
                if (walletManager) {
                    console.log('[PartialReset] Triggering fresh UTXO monitoring via wallet manager');
                    // Restart funding monitor directly
                    const fundingMonitor = walletManager.fundingMonitor;
                    if (fundingMonitor && typeof fundingMonitor.startFundingMonitoring === 'function') {
                        console.log('[PartialReset] Starting funding monitor directly');
                        fundingMonitor.startFundingMonitoring();
                    } else {
                        console.log('[PartialReset] Fallback: calling wallet manager startFundingMonitoring');
                        walletManager.startFundingMonitoring();
                    }
                } else {
                    console.warn('[PartialReset] Wallet manager not found, UTXO monitoring not started');
                }
            } else {
                console.log('[PartialReset] No wallet found, UTXO monitoring not started');
            }
        } catch (error) {
            console.warn('[PartialReset] Error starting UTXO monitoring:', error);
        }
    }

    // Log complete localStorage state for debugging
    logLocalStorageState(phase) {
        console.log(`\n🔍 =============== ${phase} ===============`);
        console.log('📋 COMPLETE LOCALSTORAGE STATE:');
        
        // Get all localStorage keys
        const allKeys = Object.keys(localStorage);
        console.log(`📊 Total localStorage keys: ${allKeys.length}`);
        
        // Group keys by type
        const broKeys = allKeys.filter(key => key.startsWith('bro_'));
        const otherKeys = allKeys.filter(key => !key.startsWith('bro_'));
        
        console.log(`🎯 BRO keys (${broKeys.length}):`, broKeys);
        console.log(`🔧 Other keys (${otherKeys.length}):`, otherKeys);
        
        // Show detailed content for BRO keys
        broKeys.forEach(key => {
            try {
                const value = localStorage.getItem(key);
                let parsedValue;
                try {
                    parsedValue = JSON.parse(value);
                    if (typeof parsedValue === 'object' && parsedValue !== null) {
                        console.log(`📋 ${key}:`, parsedValue);
                    } else {
                        console.log(`📋 ${key}: ${value}`);
                    }
                } catch (e) {
                    console.log(`📋 ${key}: ${value}`);
                }
            } catch (error) {
                console.log(`❌ Error reading ${key}:`, error);
            }
        });
        
        // Show other important keys
        const importantOtherKeys = ['charmsWallet', 'miningProgress', 'miningResult'];
        importantOtherKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                try {
                    const value = localStorage.getItem(key);
                    const parsedValue = JSON.parse(value);
                    console.log(`📋 ${key}:`, parsedValue);
                } catch (e) {
                    console.log(`📋 ${key}: ${localStorage.getItem(key)}`);
                }
            }
        });
        
        console.log(`🔍 =============== END ${phase} ===============\n`);
    }
}
