// State hydration system for loading and restoring application state
import { leadingZeros } from '../../mining/reward-calculator.js';

export class StateHydrator {
    constructor(appState) {
        this.appState = appState;
    }

    // Hydrate application state from localStorage
    async hydrateFromStorage() {
        try {
            console.log('[StateHydrator] Starting state hydration from localStorage');
            
            // Load step state and domain data
            console.log('[StateHydrator] Loading global state...');
            await this.loadGlobalState();
            console.log('[StateHydrator] Global state loaded, loading domain data...');
            await this.loadDomainData();
            this.loadProverConfig();
            // Validation disabled - saved currentStep is the truth
            await this.triggerUIRestoration();
            
            console.log('[StateHydrator] State hydration completed successfully');
            
        } catch (error) {
            console.error('[StateHydrator] Error during hydration:', error);
            this.handleHydrationError();
        }
    }

    // Load global step state from Storage system
    async loadGlobalState() {
        console.log('[StateHydrator] Loading global state');
        
        // Debug: Check saved vs loaded state
        const rawAppState = localStorage.getItem('bro_app_state');
        console.log('🚨 [StateHydrator] RAW localStorage bro_app_state:', rawAppState);
        if (rawAppState) {
            try {
                const parsed = JSON.parse(rawAppState);
                console.log('🚨 [StateHydrator] SAVED currentStep:', parsed.currentStep);
                console.log('🚨 [StateHydrator] SAVED completedSteps:', parsed.completedSteps);
            } catch (e) {
                console.log('🚨 [StateHydrator] ERROR parsing bro_app_state:', e);
            }
        }
        
        try {
            // Load state from Storage system
            const { Storage } = await import('../storage/Storage.js');
            const state = Storage.getState();
            
            if (state.global) {
                this.appState.stepCoordinator.currentStep = state.global.currentStep || 1;
                this.appState.stepCoordinator.completedSteps = state.global.completedSteps || [];
                
                console.log('[StateHydrator] Step state loaded from Storage system:', {
                    currentStep: this.appState.stepCoordinator.currentStep,
                    completedSteps: this.appState.stepCoordinator.completedSteps,
                    lastUpdated: state.global.lastUpdated
                });
                
                // Debug: Verify loaded state
                console.log('🚨 [StateHydrator] LOADED currentStep:', this.appState.stepCoordinator.currentStep);
                console.log('🚨 [StateHydrator] LOADED completedSteps:', this.appState.stepCoordinator.completedSteps);
            } else {
                console.log('[StateHydrator] No step state found, starting from Step 1');
            }
        } catch (error) {
            console.warn('[StateHydrator] Error loading global state:', error);
        }
    }

    // Load domain-specific data from localStorage
    async loadDomainData() {
        console.log('[StateHydrator] Loading domain data');
        
        // Show available localStorage keys for debugging
        console.log('[StateHydrator] DEBUG - All localStorage keys:', Object.keys(localStorage));
        
        // 🔍 FULL DEBUG: Print ALL localStorage content
        console.log('[StateHydrator] 🔍 FULL localStorage DEBUG:');
        Object.keys(localStorage).forEach(key => {
            try {
                const value = localStorage.getItem(key);
                if (key === 'bro_app_state') {
                    console.log(`[StateHydrator] 📋 ${key}:`, JSON.parse(value));
                } else {
                    console.log(`[StateHydrator] 📋 ${key}:`, value);
                }
            } catch (e) {
                console.log(`[StateHydrator] 📋 ${key}:`, localStorage.getItem(key));
            }
        });
        
        await this.loadWalletDomain();
        await this.loadMiningDomain();
        await this.loadTransactionDomain();
        await this.loadBroadcastDomain();
        await this.loadMintingDomain();
        this.loadWalletVisitDomain();
    }

    // Load wallet domain data
    async loadWalletDomain() {
        try {
            // Load wallet data from Storage system (not direct localStorage)
            const { Storage } = await import('../storage/Storage.js');
            const state = Storage.getState();
            
            // Load wallet from step1 data
            console.log('[StateHydrator] 🔍 DEBUG - step1 structure:', state.steps?.step1);
            console.log('[StateHydrator] 🔍 DEBUG - step1.data:', state.steps?.step1?.data);
            console.log('[StateHydrator] 🔍 DEBUG - step1.data.wallet:', state.steps?.step1?.data?.wallet);
            
            if (state.steps?.step1?.data?.wallet) {
                const walletData = state.steps.step1.data.wallet;
                this.appState.walletDomain.wallet = walletData;
                console.log('[StateHydrator] ✅ Wallet data loaded from Storage system');
                console.log('[StateHydrator] 📋 Wallet address:', walletData.address);
                console.log('[StateHydrator] 📋 Full wallet object:', walletData);
                
                // 🔍 DEBUG: Check if wallet was actually set in domain
                console.log('[StateHydrator] 🔍 DEBUG - walletDomain.wallet after setting:', this.appState.walletDomain.wallet);
            } else {
                console.log('[StateHydrator] ❌ No wallet data found in Storage system');
            }
            
            // Load UTXO data from step1 data OR from legacy bro_utxo_display_data
            if (state.steps?.step1?.data?.utxo) {
                this.appState.walletDomain.utxo = state.steps.step1.data.utxo;
                console.log('[StateHydrator] ✅ UTXO data loaded from Storage system:', state.steps.step1.data.utxo);
            } else {
                // Check legacy bro_utxo_display_data
                const utxoDisplayData = localStorage.getItem('bro_utxo_display_data');
                if (utxoDisplayData) {
                    try {
                        const utxo = JSON.parse(utxoDisplayData);
                        // Add address to UTXO for compatibility
                        utxo.address = state.steps.step1.data.wallet.address;
                        this.appState.walletDomain.utxo = utxo;
                        console.log('[StateHydrator] ✅ UTXO data loaded from legacy bro_utxo_display_data:', utxo);
                    } catch (e) {
                        console.warn('[StateHydrator] Error parsing bro_utxo_display_data:', e);
                    }
                } else {
                    console.log('[StateHydrator] ❌ No UTXO data found in Storage system (expected for fresh start)');
                }
            }
            
        } catch (error) {
            console.warn('[StateHydrator] Error loading wallet domain:', error);
        }
    }

    /**
     * Load mining domain data from Storage system
     */
    async loadMiningDomain() {
        try {
            const { Storage } = await import('../storage/Storage.js');
            const state = Storage.getState();
            
            // Load mining result from step2 data
            if (state.steps?.step2?.data?.miningResult) {
                this.appState.miningDomain.miningResult = state.steps.step2.data.miningResult;
                console.log('[StateHydrator] ✅ Mining result loaded from Storage system:', state.steps.step2.data.miningResult);
            } else {
                console.log('[StateHydrator] ❌ No mining result found in Storage system');
            }
            
            // Load mining progress from step2 data
            if (state.steps?.step2?.data?.miningProgress) {
                this.appState.miningDomain.miningProgress = state.steps.step2.data.miningProgress;
                console.log('[StateHydrator] ✅ Mining progress loaded from Storage system');
            } else {
                console.log('[StateHydrator] ❌ No mining progress found in Storage system');
            }
            
        } catch (error) {
            console.warn('[StateHydrator] Error loading mining domain:', error);
        }
    }

    /**
     * Load transaction domain data from Storage system
     */
    async loadTransactionDomain() {
        try {
            const { Storage } = await import('../storage/Storage.js');
            const state = Storage.getState();
            
            console.log('[StateHydrator] 🔍 DEBUG - step3 structure:', state.steps?.step3);
            console.log('[StateHydrator] 🔍 DEBUG - step3.data:', state.steps?.step3?.data);
            console.log('[StateHydrator] 🔍 DEBUG - step3.data.transaction:', state.steps?.step3?.data?.transaction);
            
            // Load transaction from step3 data
            if (state.steps?.step3?.data?.transaction) {
                this.appState.transactionDomain.transaction = state.steps.step3.data.transaction;
                console.log('[StateHydrator] ✅ Transaction data loaded from Storage system:', state.steps.step3.data.transaction);
                console.log('[StateHydrator] 🔍 DEBUG - transactionDomain.transaction after setting:', this.appState.transactionDomain.transaction);
            } else {
                console.log('[StateHydrator] ❌ No transaction data found in Storage system');
                
                // Check if we have transaction data in legacy localStorage
                const legacyTxData = localStorage.getItem('bro_transaction_data');
                if (legacyTxData) {
                    try {
                        const transaction = JSON.parse(legacyTxData);
                        console.log('[StateHydrator] ♻️ Found legacy transaction data in localStorage');
                        this.appState.transactionDomain.transaction = transaction;
                        // Persist into structured Storage for future loads
                        Storage.updateStep(3, {
                            data: { transaction: transaction }
                        });
                        console.log('[StateHydrator] ✅ Legacy transaction data migrated to Storage system');
                    } catch (e) {
                        console.warn('[StateHydrator] Error parsing legacy transaction data:', e);
                    }
                }
            }
            
        } catch (error) {
            console.warn('[StateHydrator] Error loading transaction domain:', error);
        }
    }

    /**
     * Load broadcast domain data from Storage system
     */
    async loadBroadcastDomain() {
        try {
            const { Storage } = await import('../storage/Storage.js');
            const state = Storage.getState();
            
            // Load broadcast result from step4 data
            if (state.steps?.step4?.data?.broadcastResult) {
                this.appState.broadcastDomain.broadcastResult = state.steps.step4.data.broadcastResult;
                console.log('[StateHydrator] ✅ Broadcast result loaded from Storage system:', state.steps.step4.data.broadcastResult);
                
                // Check if broadcast should advance to Step 6
                const result = state.steps.step4.data.broadcastResult;
                if (result.status === 'broadcast' && result.spellTxid) {
                    console.log('[StateHydrator] 🎯 BROADCAST DATA FOUND - Should advance to Step 6!');
                    console.log('[StateHydrator] ✅ Valid broadcast - Step should be 6');
                    console.log('[StateHydrator] 🔧 FORCING currentStep to 6 due to completed broadcast');
                    
                    // Force currentStep to 6 since broadcast is complete
                    this.appState.stepCoordinator.setCurrentStep(6);
                    this.appState.saveCurrentStep();
                } else {
                    // If we have a broadcast result (Step 4 completed) but not minting yet, ensure currentStep is at least 5
                    if (this.appState.stepCoordinator.currentStep < 5) {
                        console.log('[StateHydrator] 🔧 Setting currentStep to 5 due to existing broadcast result');
                        this.appState.stepCoordinator.setCurrentStep(5);
                    }
                }
            } else {
                console.log('[StateHydrator] ❌ No broadcast result found in Storage system');
                
                // CRITICAL: Check legacy bro_broadcast_data for successful broadcast
                const legacyBroadcastData = localStorage.getItem('bro_broadcast_data');
                if (legacyBroadcastData) {
                    try {
                        const broadcastData = JSON.parse(legacyBroadcastData);
                        console.log('[StateHydrator] ♻️ Found legacy broadcast data:', broadcastData);
                        
                        if (broadcastData.success === true && broadcastData.txid) {
                            console.log('[StateHydrator] 🎯 SUCCESSFUL BROADCAST FOUND - Migrating to Storage and advancing to Step 5');
                            
                            // Create proper broadcast result structure
                            const broadcastResult = {
                                txid: broadcastData.txid,
                                success: true,
                                timestamp: Date.now()
                            };
                            
                            // Set in domain
                            this.appState.broadcastDomain.broadcastResult = broadcastResult;
                            
                            // Persist to Storage system
                            Storage.updateStep(4, {
                                isCompleted: true,
                                data: { broadcastResult: broadcastResult }
                            });
                            
                            // CRITICAL: Advance to Step 5 since broadcast was successful
                            if (this.appState.stepCoordinator.currentStep < 5) {
                                console.log('[StateHydrator] 🔧 ADVANCING to Step 5 due to successful broadcast');
                                this.appState.stepCoordinator.setCurrentStep(5);
                                this.appState.stepCoordinator.completeStep(4); // Mark Step 4 as completed
                                this.appState.saveCurrentStep();
                            }
                            
                            console.log('[StateHydrator] ✅ Legacy broadcast data migrated and advanced to Step 5');
                        }
                    } catch (e) {
                        console.warn('[StateHydrator] Error parsing legacy broadcast data:', e);
                    }
                }
            }
            
        } catch (error) {
            console.warn('[StateHydrator] Error loading broadcast domain:', error);
        }
    }

    /**
     * Load signed transactions
     */
    loadSignedTransactions() {
        try {
            const signedData = localStorage.getItem('bro_signed_transactions');
            if (signedData) {
                const result = JSON.parse(signedData);
                // Store in appropriate domain or state location
                console.log('[StateHydrator] ✅ Signed transactions loaded:', result);
                console.log('[StateHydrator] ✅ Number of signed transactions:', result.transactions?.length || 0);
                if (result.transactions) {
                    result.transactions.forEach((tx, index) => {
                        console.log(`[StateHydrator] ✅ Transaction ${index + 1}: ${tx.type} - ${tx.hex?.substring(0, 64)}...`);
                    });
                }
            } else {
                console.log('[StateHydrator] ❌ No signed transactions found in localStorage');
            }
        } catch (error) {
            console.warn('[StateHydrator] Error loading signed transactions:', error);
        }
    }

    /**
     * Load minting domain data
     */
    async loadMintingDomain() {
        try {
            // Load minting data from global state
            const { Storage } = await import('../storage/Storage.js');
            const state = Storage.getState();
            
            if (state.global && state.global.mintingResult) {
                this.appState.mintingDomain.mintingResult = state.global.mintingResult;
                console.log('[StateHydrator] ✅ Minting result loaded from global state:', state.global.mintingResult);
                
                // CRITICAL: If we have mintingResult, currentStep should be 6
                if (this.appState.stepCoordinator.currentStep < 6) {
                    console.log('[StateHydrator] 🔧 Setting currentStep to 6 due to existing minting result');
                    this.appState.stepCoordinator.setCurrentStep(6);
                }
            } else {
                console.log('[StateHydrator] ❌ No minting result found in global state');
                
                // Check legacy localStorage for signed transactions
                const legacySignedTx = localStorage.getItem('bro_signed_transactions');
                if (legacySignedTx) {
                    try {
                        const signedData = JSON.parse(legacySignedTx);
                        console.log('[StateHydrator] ♻️ Found legacy signed transactions - minting was completed');
                        // If we have signed transactions, minting was completed, should be Step 6
                        if (this.appState.stepCoordinator.currentStep < 6) {
                            console.log('[StateHydrator] 🔧 Setting currentStep to 6 due to legacy signed transactions');
                            this.appState.stepCoordinator.setCurrentStep(6);
                        }
                    } catch (e) {
                        console.warn('[StateHydrator] Error parsing legacy signed transactions:', e);
                    }
                }
            }
            
            if (state.global && state.global.signedTransactions) {
                this.appState.mintingDomain.signedTransactions = state.global.signedTransactions;
                console.log('[StateHydrator] Signed transactions loaded from global state');
            }
            
            console.log('[StateHydrator] Minting domain loaded');
        } catch (error) {
            console.warn('[StateHydrator] Error loading minting domain:', error);
        }
    }

    /**
     * Load wallet visit domain
     */
    loadWalletVisitDomain() {
        try {
            // Wallet visit domain doesn't need specific localStorage data
            // It's enabled based on step completion
            console.log('[StateHydrator] Wallet visit domain checked');
        } catch (error) {
            console.warn('[StateHydrator] Error loading wallet visit domain:', error);
        }
    }

    /**
     * Load prover configuration
     */
    loadProverConfig() {
        try {
            const proverConfig = localStorage.getItem('bro_prover_config');
            if (proverConfig) {
                this.appState.proverConfig = JSON.parse(proverConfig);
                console.log('[StateHydrator] Prover config loaded');
            }
        } catch (error) {
            console.error('[StateHydrator] Error loading prover config:', error);
        }
    }


    /**
     * Trigger UI restoration for all domains
     */
    async triggerUIRestoration() {
        console.log('[StateHydrator] Triggering UI restoration');
        
        // Prepare restoration data inline (no need for separate class)
        const restorationData = this.getStepDataForRestoration();
        
        // Emit uiRestorationNeeded event
        this.appState.emit('uiRestorationNeeded', {
            stepData: restorationData,
            currentStep: this.appState.currentStep,
            completedSteps: this.appState.completedSteps
        });
        
        // NEW: Emit stepChanged events for each active step (unified system)
        await this.emitStepChangedEvents(restorationData);
        
        console.log('[StateHydrator] UI restoration triggered');
    }

    /**
     * Get step data for UI restoration (inline - no separate class needed)
     */
    getStepDataForRestoration() {
        return {
            step1: {
                hasWallet: this.appState.walletDomain.hasWallet(),
                hasUtxo: this.appState.walletDomain.hasUtxo(),
                isActive: this.appState.stepCoordinator.isStepActive(1),
                isCompleted: this.appState.stepCoordinator.isStepCompleted(1)
            },
            step2: {
                hasResult: !!this.appState.miningDomain.miningResult,
                hasProgress: !!this.appState.miningDomain.miningProgress,
                isActive: this.appState.stepCoordinator.isStepActive(2),
                isCompleted: this.appState.stepCoordinator.isStepCompleted(2)
            },
            step3: {
                hasTransaction: !!this.appState.transactionDomain.transaction,
                isActive: this.appState.stepCoordinator.isStepActive(3),
                isCompleted: this.appState.stepCoordinator.isStepCompleted(3)
            },
            step4: {
                hasBroadcast: !!this.appState.broadcastDomain.broadcastResult,
                isActive: this.appState.stepCoordinator.isStepActive(4),
                isCompleted: this.appState.stepCoordinator.isStepCompleted(4)
            },
            step5: {
                hasMinting: !!this.appState.mintingDomain.mintingResult,
                isActive: this.appState.stepCoordinator.isStepActive(5),
                isCompleted: this.appState.stepCoordinator.isStepCompleted(5)
            },
            step6: {
                isActive: this.appState.stepCoordinator.isStepActive(6),
                isCompleted: this.appState.stepCoordinator.isStepCompleted(6)
            }
        };
    }

    /**
     * Emit stepChanged events for active steps during hydration
     */
    async emitStepChangedEvents(stepData) {
        console.log('[StateHydrator] Emitting stepChanged events for hydration');
        console.log('[StateHydrator] DEBUG - stepData received:', stepData);
        
        // Step 2: Enable based on currentStep and completion status
        const currentStep = this.appState.stepCoordinator.currentStep;
        
        if (stepData.step2?.isCompleted) {
            if (currentStep >= 4) {
                // If we're in Step 4 or beyond, permanently disable mining
                console.log('[StateHydrator] Hydration: currentStep >= 4 - permanently disabling mining');
                this.appState.emit('step2Disabled');
            } else if (currentStep === 2 || currentStep === 3) {
                // If we're in Step 2 or 3, enable mining button
                console.log('[StateHydrator] Hydration: currentStep 2/3 - enabling mining');
                this.appState.emit('stepChanged', {
                    step: 2,
                    enabled: true,
                    data: { fromHydration: true, stepData: stepData.step2 }
                });
            }
        } else {
            console.log('[StateHydrator] DEBUG - Step 2 not completed:', {
                step2Exists: !!stepData.step2,
                isCompleted: stepData.step2?.isCompleted,
                currentStep: currentStep
            });
        }
        
        // Step 3: Check for valid mining results and auto-advance if needed
        // Get mining result directly from Storage (domain might not be loaded yet)
        const { Storage } = await import('../storage/Storage.js');
        const state = Storage.getState();
        const miningResult = state.steps?.step2?.data?.miningResult;
        const hasMiningResults = miningResult?.bestHash && miningResult?.bestNonce > 0;
        
        console.log('[StateHydrator] DEBUG - Mining results check:', {
            currentStep: currentStep,
            miningResultFromStorage: !!miningResult,
            bestHash: miningResult?.bestHash ? 'YES' : 'NO',
            bestNonce: miningResult?.bestNonce || 'NONE',
            hasMiningResults: hasMiningResults
        });
        
        if (hasMiningResults && currentStep === 2) {
            // Auto-advance from Step 2 to Step 3 if we have valid mining results
            console.log('[StateHydrator] Hydration: Valid mining results found - auto-advancing to Step 3');
            this.appState.stepCoordinator.completeStep(2);
            this.appState.stepCoordinator.setCurrentStep(3);
            this.appState.transactionDomain.enable();
            this.appState.emit('stepChanged', {
                step: 3,
                enabled: true,
                data: { fromHydration: true, miningResults: miningResult }
            });
        } else if (currentStep === 3 && stepData.step2?.isCompleted) {
            // Enable Step 3 if we're already on it
            console.log('[StateHydrator] Hydration: currentStep === 3 - enabling Create Transaction');
            this.appState.emit('stepChanged', {
                step: 3,
                enabled: true,
                data: { fromHydration: true, miningResults: miningResult }
            });
        }
        
        // Step 4: Enable only if currentStep === 4 (simple and direct)
        if (currentStep === 4 && stepData.step3?.hasTransaction) {
            console.log('[StateHydrator] Hydration: currentStep === 4 - enabling Broadcast');
            this.appState.emit('stepChanged', {
                step: 4,
                enabled: true,
                data: { fromHydration: true, transaction: stepData.step3 }
            });
        }
        
        // Step 5: Enable only if currentStep === 5 (minting step)
        if (currentStep === 5) {
            console.log('[StateHydrator] Hydration: currentStep === 5 - enabling Minting');
            this.appState.emit('stepChanged', {
                step: 5,
                enabled: true,
                data: { fromHydration: true, broadcast: stepData.step4 }
            });
        }
    }

    // Handle hydration errors
    handleHydrationError() {
        console.warn('[StateHydrator] Hydration failed, performing clean initialization');
        
        // Reset to clean state
        this.appState.stepCoordinator.setCurrentStep(1);
        this.appState.stepCoordinator.completedSteps = [];
        
        // Initialize Step 1 only
        if (this.appState.walletDomain) {
            // Don't reset wallet domain completely, just ensure clean state
            console.log('[StateHydrator] Initialized clean state');
        }
        
        // Update UI for Step 1
        this.appState.emit('stepChanged', {
            step: 1,
            enabled: true,
            completedSteps: []
        });
    }
}
