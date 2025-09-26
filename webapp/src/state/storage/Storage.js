// Application state persistence layer
// Manages structured JSON storage in localStorage
export class Storage {
    static STORAGE_KEY = 'bro_app_state';

    // Retrieves application state from localStorage
    static getState() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return this.getDefaultState();
            
            const state = JSON.parse(stored);
            return { ...this.getDefaultState(), ...state };
        } catch (error) {
            console.warn('[AppStateStorage] Error loading state, using defaults:', error);
            return this.getDefaultState();
        }
    }

    // Persists application state to localStorage
    static saveState(state) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state, null, 2));
            console.log('[AppStateStorage] State saved successfully');
        } catch (error) {
            console.error('[AppStateStorage] Error saving state:', error);
        }
    }

    // Updates individual step state
    static updateStep(stepNumber, stepData) {
        const state = this.getState();
        state.steps[`step${stepNumber}`] = {
            ...state.steps[`step${stepNumber}`],
            ...stepData,
            lastUpdated: Date.now()
        };
        this.saveState(state);
    }

    // Updates global application state
    static updateGlobal(globalData) {
        const state = this.getState();
        state.global = {
            ...state.global,
            ...globalData,
            lastUpdated: Date.now()
        };
        this.saveState(state);
    }

    // Returns default application state structure
    static getDefaultState() {
        return {
            version: '1.0',
            lastUpdated: Date.now(),
            global: {
                currentStep: 1,
                completedSteps: [],
                proverConfig: {
                    isCustomProverMode: false,
                    customProverUrl: ''
                }
            },
            steps: {
                step1: {
                    isActive: false,
                    isCompleted: false,
                    data: {
                        wallet: null,
                        utxo: null,
                        isMonitoring: false
                    },
                    ui: {
                        walletDisplayed: false,
                        utxoDisplayed: false,
                        monitoringActive: false
                    }
                },
                step2: {
                    isActive: false,
                    isCompleted: false,
                    data: {
                        miningResult: null,
                        miningProgress: null,
                        isRunning: false,
                        mode: 'cpu'
                    },
                    ui: {
                        buttonText: 'Start Mining',
                        buttonEnabled: false,
                        miningDisplayVisible: false,
                        miningDisabled: false
                    }
                },
                step3: {
                    isActive: false,
                    isCompleted: false,
                    data: {
                        transaction: null
                    },
                    ui: {
                        buttonText: 'Create Transaction',
                        buttonEnabled: false,
                        transactionDisplayed: false
                    }
                },
                step4: {
                    isActive: false,
                    isCompleted: false,
                    data: {
                        broadcastResult: null
                    },
                    ui: {
                        buttonText: 'Broadcast to Network',
                        buttonEnabled: false,
                        broadcastDisplayed: false
                    }
                },
                step5: {
                    isActive: false,
                    isCompleted: false,
                    data: {
                        signedTransactions: null,
                        mintingResult: null
                    },
                    ui: {
                        buttonText: 'Start BRO Token Minting',
                        buttonEnabled: false
                    }
                },
                step6: {
                    isActive: false,
                    isCompleted: false,
                    data: {
                        walletVisitEnabled: false
                    },
                    ui: {
                        walletVisitEnabled: false,
                        showMintMore: false,
                        showGoToWallet: false
                    }
                }
            }
        };
    }

    // Resets application state while preserving custom prover URL
    static clear() {
        console.log('[Storage] CLEAR - Starting complete reset');
        const currentState = this.getState();
        console.log('[Storage] CLEAR - Current state before reset:', currentState);
        
        const resetState = this.getDefaultState();
        console.log('[Storage] CLEAR - Default state:', resetState);
        
        // Preserve user's custom prover URL setting
        if (currentState.global?.proverConfig?.customProverUrl) {
            resetState.global.proverConfig.customProverUrl = currentState.global.proverConfig.customProverUrl;
            console.log('[Storage] CLEAR - Preserved custom prover URL');
        }
        
        this.saveState(resetState);
        console.log('[Storage] CLEAR - Reset state saved to localStorage');
        
        // Verify the save worked
        const verifyState = this.getState();
        console.log('[Storage] CLEAR - Verification - state after save:', verifyState);
        console.log('[AppStateStorage] All data cleared, custom prover URL preserved');
    }

    // Resets minting data while preserving wallet and prover config
    static partialReset() {
        const state = this.getState();
        const walletData = state.steps.step1.data.wallet;
        const proverConfig = state.global.proverConfig;
        
        const resetState = this.getDefaultState();
        resetState.steps.step1.data.wallet = walletData;
        resetState.global.proverConfig = proverConfig;
        
        this.saveState(resetState);
        console.log('[AppStateStorage] Partial reset completed');
    }
}
