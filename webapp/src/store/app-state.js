export class AppState {
    constructor() {
        console.log(`[AppState] Constructor starting...`);
        this.wallet = null;
        this.miningResult = null;
        this.utxo = null;
        this.transaction = null;
        this.broadcastResult = null;
        this.signedTransactions = null;
        this.currentStep = 1;
        this.completedSteps = [];
        this.isMonitoring = false;
        this.monitoringStopFunction = null;
        this.proverConfig = {
            isCustomProverMode: false,
            customProverUrl: ''
        };

        this.STEPS = {
            WALLET_CREATION: 1,
            MINING: 2,
            TRANSACTION_CREATION: 3,
            BROADCAST: 4,
            CLAIM_TOKENS: 5,
            VISIT_WALLET: 6
        };

        this.listeners = {
            walletCreated: [],
            miningCompleted: [],
            utxoFound: [],
            transactionCreated: [],
            broadcastCompleted: [],
            stepChanged: []
        };

        // Initialize state from localStorage
        console.log(`[AppState] Loading initial state from localStorage...`);
        this.currentStep = this.loadCurrentStep();
        this.completedSteps = this.loadCompletedSteps();
        console.log(`[AppState] Initial state loaded - currentStep: ${this.currentStep}, completedSteps:`, this.completedSteps);
        this.cleanupStaleData();
        this.loadFromStorage();
        console.log(`[AppState] Constructor completed - Final state: currentStep: ${this.currentStep}, completedSteps:`, this.completedSteps);
    }

    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    // Step management methods
    loadCurrentStep() {
        const saved = localStorage.getItem('bro_current_step');
        const currentStep = saved ? parseInt(saved) : this.STEPS.WALLET_CREATION;
        console.log(`[AppState] loadCurrentStep - localStorage value: ${saved}, parsed: ${currentStep}`);
        return currentStep;
    }

    saveCurrentStep() {
        localStorage.setItem('bro_current_step', this.currentStep.toString());
    }

    loadCompletedSteps() {
        const saved = localStorage.getItem('bro_completed_steps');
        const completedSteps = saved ? JSON.parse(saved) : [];
        console.log(`[AppState] loadCompletedSteps - localStorage value: ${saved}, parsed:`, completedSteps);
        return completedSteps;
    }

    saveCompletedSteps() {
        localStorage.setItem('bro_completed_steps', JSON.stringify(this.completedSteps));
    }

    loadFromStorage() {
        console.log(`[AppState] loadFromStorage starting...`);
        // Load wallet data first - everything depends on having a wallet
        const walletData = localStorage.getItem('bro_wallet_data');
        console.log(`[AppState] Wallet data in localStorage:`, walletData ? 'found' : 'not found');
        if (walletData) {
            try {
                const data = JSON.parse(walletData);
                this.wallet = data;
                console.log(`[AppState] Wallet loaded successfully:`, data);
            } catch (error) {
                console.warn('[AppState] Invalid wallet data, resetting state');
                this.reset();
                return;
            }
        } else {
            // No wallet means we should be at step 1
            console.log(`[AppState] No wallet found, setting to step 1`);
            this.currentStep = this.STEPS.WALLET_CREATION;
            this.completedSteps = [];
            this.saveCurrentStep();
            this.saveCompletedSteps();
            return;
        }

        // Only load other data if we have a wallet
        // Load UTXO data
        const utxoData = localStorage.getItem('bro_utxo_data');
        console.log(`[AppState] UTXO data in localStorage:`, utxoData ? 'found' : 'not found');
        if (utxoData) {
            try {
                this.utxo = JSON.parse(utxoData);
                console.log(`[AppState] UTXO loaded successfully:`, this.utxo);
            } catch (error) {
                console.warn('[AppState] Invalid UTXO data, clearing');
                localStorage.removeItem('bro_utxo_data');
            }
        }

        // Load transaction data
        const transactionData = localStorage.getItem('bro_transaction_data');
        if (transactionData) {
            try {
                this.transaction = JSON.parse(transactionData);
            } catch (error) {
                console.warn('Invalid transaction data, clearing');
                localStorage.removeItem('bro_transaction_data');
            }
        }

        // Load broadcast result
        const broadcastData = localStorage.getItem('bro_broadcast_data');
        if (broadcastData) {
            try {
                this.broadcastResult = JSON.parse(broadcastData);
            } catch (error) {
                console.warn('Invalid broadcast data, clearing');
                localStorage.removeItem('bro_broadcast_data');
            }
        }

        // Load signed transactions
        const signedTxData = localStorage.getItem('bro_signed_transactions');
        if (signedTxData) {
            try {
                this.signedTransactions = JSON.parse(signedTxData);
            } catch (error) {
                console.warn('Invalid signed transaction data, clearing');
                localStorage.removeItem('bro_signed_transactions');
            }
        }

        // Load prover configuration
        const proverConfigData = localStorage.getItem('bro_prover_config');
        if (proverConfigData) {
            try {
                this.proverConfig = JSON.parse(proverConfigData);
                console.log(`[AppState] Prover config loaded:`, this.proverConfig);
            } catch (error) {
                console.warn('Invalid prover config data, clearing');
                localStorage.removeItem('bro_prover_config');
                this.proverConfig = { isCustomProverMode: false, customProverUrl: '' };
            }
        }

        // Load mining result for transaction creation validation
        console.log(`[AppState] Loading mining result...`);
        this.loadMiningResult();
        console.log(`[AppState] Mining result after load:`, this.miningResult);

        // Validate state consistency after loading all data
        console.log(`[AppState] Starting state validation...`);
        this.validateStateConsistency();
        console.log(`[AppState] State validation completed - currentStep: ${this.currentStep}, completedSteps:`, this.completedSteps);
    }

    // Validate that the state is consistent and fix any inconsistencies
    validateStateConsistency() {
        console.log(`[AppState] validateStateConsistency - wallet: ${!!this.wallet}, utxo: ${!!this.utxo}, miningResult: ${!!this.miningResult}`);
        
        // If we don't have a wallet, we should be at step 1 with no completed steps
        if (!this.wallet) {
            console.log(`[AppState] No wallet found, setting to step 1`);
            this.currentStep = this.STEPS.WALLET_CREATION;
            this.completedSteps = [];
            this.saveCurrentStep();
            this.saveCompletedSteps();
            return;
        }

        // If we have a wallet but no UTXO, we should stay at step 1 until UTXO is found
        if (this.wallet && !this.utxo) {
            console.log(`[AppState] Wallet found but no UTXO, staying at step 1 until UTXO is found`);
            this.currentStep = this.STEPS.WALLET_CREATION;
            this.completedSteps = [this.STEPS.WALLET_CREATION];
            this.saveCurrentStep();
            this.saveCompletedSteps();
            return;
        }

        // If we have wallet and UTXO but no mining result, check if mining was already completed
        if (this.wallet && this.utxo && !this.miningResult) {
            // If Step 2 (MINING) is already completed, don't force back to step 2
            if (this.completedSteps.includes(this.STEPS.MINING)) {
                console.log(`[AppState] Wallet and UTXO found, no mining result, but Step 2 already completed - proceeding to recalculate`);
                // Continue to recalculateCurrentStep to determine correct next step
            } else {
                console.log(`[AppState] Wallet and UTXO found but no mining result and Step 2 not completed, staying at step 2`);
                this.currentStep = this.STEPS.MINING;
                if (!this.completedSteps.includes(this.STEPS.WALLET_CREATION)) {
                    this.completedSteps.push(this.STEPS.WALLET_CREATION);
                }
                this.saveCurrentStep();
                this.saveCompletedSteps();
                return;
            }
        }

        // Continue with normal state progression based on what data we have
        console.log(`[AppState] All basic data found, proceeding to recalculateCurrentStep`);
        this.recalculateCurrentStep();
    }

    // Recalculate current step based on available data
    recalculateCurrentStep() {
        let calculatedStep = this.STEPS.WALLET_CREATION;
        let calculatedCompleted = [];

        if (this.wallet) {
            calculatedCompleted.push(this.STEPS.WALLET_CREATION);
            calculatedStep = this.STEPS.MINING;
        }

        // Check if mining is complete - either we have miningResult OR we have a reward calculated
        const hasMiningReward = this.miningReward > 0;
        console.log(`[AppState] recalculateCurrentStep - miningResult:`, !!this.miningResult, 'miningReward:', this.miningReward, 'hasMiningReward:', hasMiningReward);
        
        if (this.miningResult || hasMiningReward) {
            calculatedCompleted.push(this.STEPS.MINING);
            calculatedStep = this.STEPS.TRANSACTION_CREATION;
            
            // If we have mining reward but no miningResult, try to reconstruct it
            if (!this.miningResult && hasMiningReward && window.BitcoinMiner) {
                try {
                    const miner = new window.BitcoinMiner();
                    const progress = miner.loadMiningProgress();
                    if (progress && progress.bestHash && progress.bestNonce) {
                        this.miningResult = {
                            bestHash: progress.bestHash,
                            bestNonce: progress.bestNonce,
                            difficulty: progress.difficulty || 20,
                            timestamp: Date.now()
                        };
                        // Save it to localStorage for future loads
                        localStorage.setItem('miningResult', JSON.stringify(this.miningResult));
                        console.log(`[AppState] Reconstructed miningResult from BitcoinMiner:`, this.miningResult);
                    }
                } catch (error) {
                    console.warn('[AppState] Failed to reconstruct miningResult:', error);
                }
            }
        }

        if (this.transaction) {
            calculatedCompleted.push(this.STEPS.TRANSACTION_CREATION);
            calculatedStep = this.STEPS.BROADCAST;
        }

        if (this.broadcastResult) {
            calculatedCompleted.push(this.STEPS.BROADCAST);
            calculatedStep = this.STEPS.CLAIM_TOKENS;
            
            // Check if we have signed transactions (Step 5 completion indicator)
            if (this.signedTransactions) {
                calculatedCompleted.push(this.STEPS.CLAIM_TOKENS);
                calculatedStep = this.STEPS.VISIT_WALLET;
            }
        }

        // Only update if there's a discrepancy
        console.log(`[AppState] recalculateCurrentStep - Current: ${this.currentStep}, Calculated: ${calculatedStep}`);
        console.log(`[AppState] recalculateCurrentStep - Current completed:`, this.completedSteps, 'Calculated completed:', calculatedCompleted);
        
        if (this.currentStep !== calculatedStep || 
            JSON.stringify(this.completedSteps.sort()) !== JSON.stringify(calculatedCompleted.sort())) {
            console.log(`[AppState] State discrepancy found, updating state`);
            this.currentStep = calculatedStep;
            this.completedSteps = calculatedCompleted;
            this.saveCurrentStep();
            this.saveCompletedSteps();
            console.log(`[AppState] State updated - currentStep: ${this.currentStep}, completedSteps:`, this.completedSteps);
        } else {
            console.log(`[AppState] No state changes needed`);
        }
    }

    loadMiningResult() {
        // First try to load from localStorage directly
        const storedResult = localStorage.getItem('miningResult');
        console.log(`[AppState] Loading mining result from localStorage:`, storedResult ? 'found' : 'not found');
        if (storedResult) {
            try {
                const result = JSON.parse(storedResult);
                this.miningResult = result;
                console.log(`[AppState] Mining result loaded:`, result);
                if (!this.isStepCompleted(this.STEPS.MINING)) {
                    this.completeStep(this.STEPS.MINING);
                }
                this.emit('miningCompleted', result);
                return result;
            } catch (error) {
                console.warn('[AppState] Error parsing mining result:', error);
            }
        }

        // Fallback to BitcoinMiner if available
        if (window.BitcoinMiner) {
            try {
                const miner = new window.BitcoinMiner();
                const result = miner.loadMiningResult();
                console.log(`[AppState] BitcoinMiner fallback result:`, result);
                if (result) {
                    this.miningResult = result;
                    if (!this.isStepCompleted(this.STEPS.MINING)) {
                        this.completeStep(this.STEPS.MINING);
                    }
                    this.emit('miningCompleted', result);
                    return result;
                }
            } catch (error) {
                console.warn('[AppState] BitcoinMiner fallback error:', error);
            }
        }

        return null;
    }

    completeStep(step) {
        console.log(`[AppState] completeStep called for step ${step}. Current: ${this.currentStep}, Completed:`, this.completedSteps);
        if (!this.completedSteps.includes(step)) {
            this.completedSteps.push(step);
            this.saveCompletedSteps();
        }

        // Advance to next step if current
        if (this.currentStep === step) {
            this.advanceToNextStep();
        }

        this.emit('stepCompleted', { step, completedSteps: this.completedSteps });
    }

    advanceToNextStep() {
        const prev = this.currentStep;
        if (this.currentStep < this.STEPS.VISIT_WALLET) {
            this.currentStep++;
            this.saveCurrentStep();
            console.log(`[AppState] advanceToNextStep: ${prev} -> ${this.currentStep}`);
            this.emit('stepChanged', {
                step: this.currentStep,
                enabled: true,
                completedSteps: this.completedSteps
            });
        }
    }

    isStepCompleted(step) {
        return this.completedSteps.includes(step);
    }

    isStepActive(step) {
        return this.currentStep === step;
    }

    canAccessStep(step) {
        return step <= this.currentStep;
    }

    completeWalletCreation(wallet) {
        this.wallet = wallet;
        // Save wallet data to localStorage
        localStorage.setItem('bro_wallet_data', JSON.stringify(wallet));

        this.completeStep(this.STEPS.WALLET_CREATION);
        this.emit('walletCreated', wallet);

    }

    completeMining(result) {
        this.miningResult = result;
        // Save mining result to localStorage immediately
        localStorage.setItem('miningResult', JSON.stringify(result));
        console.log(`[AppState] Mining result saved to localStorage:`, result);
        this.completeStep(this.STEPS.MINING);
        this.emit('miningCompleted', result);

    }

    completeFunding(utxo) {
        this.utxo = utxo;
        this.isMonitoring = false;
        
        // Stop any ongoing monitoring
        this.stopMonitoring();
        
        // Persist UTXO so state survives page reloads
        try { localStorage.setItem('bro_utxo_data', JSON.stringify(utxo)); } catch (_) { }
        
        // Complete Step 1 and advance to Step 2 when UTXO is found
        if (!this.isStepCompleted(this.STEPS.WALLET_CREATION)) {
            this.completeStep(this.STEPS.WALLET_CREATION);
        }
        this.setCurrentStep(this.STEPS.MINING);
        this.emit('utxoFound', utxo);
    }

    completeMonitoring(utxo) {
        this.utxo = utxo;
        this.isMonitoring = false;
        // Persist UTXO so state survives page reloads
        try { localStorage.setItem('bro_utxo_data', JSON.stringify(utxo)); } catch (_) { }
        this.setCurrentStep(this.STEPS.MINING);
        this.emit('utxoFound', utxo);

        // Emit step change to update button states
        this.emit('stepChanged', {
            step: this.currentStep,
            enabled: true,
            completedSteps: this.completedSteps
        });
    }

    completeTransactionCreation(transaction) {
        this.transaction = transaction;
        // Save transaction data to localStorage
        localStorage.setItem('bro_transaction_data', JSON.stringify(transaction));

        this.completeStep(this.STEPS.TRANSACTION_CREATION);
        this.emit('transactionCreated', transaction);

    }

    completeBroadcast(result) {
        // Backward compatibility: treat as Step 4 broadcast completion
        this.completeMiningBroadcast(result);
    }

    // Step 4: Mining transaction broadcast completed -> advance to Step 5
    completeMiningBroadcast(result) {
        this.broadcastResult = result;
        // Save broadcast result to localStorage
        localStorage.setItem('bro_broadcast_data', JSON.stringify(result));

        // Step 4 broadcast completion should advance to Step 5
        this.completeStep(this.STEPS.BROADCAST);
        this.setCurrentStep(this.STEPS.CLAIM_TOKENS);
        this.emit('transactionBroadcast', result);

    }

    // Step 5: Commit/Spell broadcast completed -> advance to Step 6
    completeMintingBroadcast(result) {
        console.log('[AppState] completeMintingBroadcast called with result:', result);
        this.broadcastResult = result;
        // Save final broadcast result to localStorage
        localStorage.setItem('bro_broadcast_data', JSON.stringify(result));

        console.log('[AppState] Before completeStep - currentStep:', this.currentStep, 'completedSteps:', this.completedSteps);
        // Complete Step 5 and advance to Step 6
        this.completeStep(this.STEPS.CLAIM_TOKENS);
        console.log('[AppState] After completeStep - currentStep:', this.currentStep, 'completedSteps:', this.completedSteps);
        
        this.setCurrentStep(this.STEPS.VISIT_WALLET);
        console.log('[AppState] After setCurrentStep - currentStep:', this.currentStep, 'completedSteps:', this.completedSteps);
        
        this.emit('transactionBroadcast', result);

    }

    canStartMining() {
        return this.wallet !== null && this.utxo !== null;
    }

    canCreateTransaction() {
        // Check if we have a completed mining result
        if (this.miningResult !== null && this.utxo !== null) {
            return true;
        }

        // If no completed result, check if we have mining progress with a best result
        if (this.utxo !== null && window.BitcoinMiner) {
            const miner = new window.BitcoinMiner();
            const miningProgress = miner.loadMiningProgress();
            if (miningProgress && miningProgress.bestHash && miningProgress.bestNonce) {
                return true;
            }
        }

        return false;
    }

    canStartMonitoring() {
        return this.wallet !== null && this.miningResult !== null;
    }

    // Getter to calculate the reward from the mining result
    get miningReward() {
        // First try from miningResult
        if (this.miningResult && this.miningResult.bestHash && this.miningResult.bestNonce) {
            try {
                if (window.calculateRewardInfo) {
                    const rewardInfo = window.calculateRewardInfo(this.miningResult.bestNonce, this.miningResult.bestHash);
                    return Number(rewardInfo.rawAmount);
                }
            } catch (_) {}
        }

        // Fallback: try to get mining data from BitcoinMiner directly
        if (window.BitcoinMiner) {
            try {
                const miner = new window.BitcoinMiner();
                const progress = miner.loadMiningProgress();
                if (progress && progress.bestHash && progress.bestNonce && window.calculateRewardInfo) {
                    const rewardInfo = window.calculateRewardInfo(progress.bestNonce, progress.bestHash);
                    console.log(`[AppState] miningReward fallback - nonce: ${progress.bestNonce}, hash: ${progress.bestHash}, reward: ${rewardInfo.rawAmount}`);
                    return Number(rewardInfo.rawAmount);
                }
            } catch (_) {}
        }

        return 0;
    }

    startMonitoring(stopFunction) {
        this.isMonitoring = true;
        this.monitoringStopFunction = stopFunction;
    }

    stopMonitoring() {
        if (this.monitoringStopFunction && typeof this.monitoringStopFunction === 'function') {
            this.monitoringStopFunction();
        }
        this.monitoringStopFunction = null;
        this.isMonitoring = false;
    }

    /**
     * Clean up stale data from localStorage to prevent deployment issues
     */
    cleanupStaleData() {
        try {
            const transactionData = localStorage.getItem('bro_transaction_data');
            if (transactionData) {
                const parsed = JSON.parse(transactionData);
                const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
                const now = Date.now();

                // Check if data is older than threshold or contains known problematic txids
                const staleTxids = [
                    '4f5fc22d074d1743688f48866c22d1d805b30377dea9542945e3e9d9360cbb9e', // Known stale txid
                ];

                const isStale = staleTxids.includes(parsed.txid) ||
                    (parsed.timestamp && (now - parsed.timestamp) > staleThreshold);

                if (isStale) {
                    this.reset();
                    return;
                }
            }
        } catch (error) {
            this.reset();
        }
    }

    reset() {
        // Clear localStorage
        localStorage.removeItem('bro_current_step');
        localStorage.removeItem('bro_completed_steps');
        localStorage.removeItem('bro_wallet_data');
        localStorage.removeItem('bro_transaction_data');
        localStorage.removeItem('bro_broadcast_data');
        localStorage.removeItem('bro_signed_transactions');
        localStorage.removeItem('bro_prover_config');
        // Clear mining data
        localStorage.removeItem('miningProgress');
        localStorage.removeItem('miningResult');

        // Reset state
        this.wallet = null;
        this.miningResult = null;
        this.utxo = null;
        this.transaction = null;
        this.broadcastResult = null;
        this.signedTransactions = null;
        this.currentStep = 1;
        this.completedSteps = [];
        this.proverConfig = { isCustomProverMode: false, customProverUrl: '' };
        this.stopMonitoring();

        this.emit('stepChanged', {
            step: this.currentStep,
            enabled: true,
            completedSteps: this.completedSteps
        });
    }

    partialReset() {
        console.log('[AppState] partialReset starting...');
        // Clear localStorage except wallet data
        localStorage.removeItem('bro_current_step');
        localStorage.removeItem('bro_completed_steps');
        localStorage.removeItem('bro_transaction_data');
        localStorage.removeItem('bro_broadcast_data');
        localStorage.removeItem('bro_signed_transactions');
        localStorage.removeItem('bro_utxo_data');
        // Clear mining data
        localStorage.removeItem('miningProgress');
        localStorage.removeItem('miningResult');

        // Reset state but keep wallet and prover config
        const currentWallet = this.wallet; // Preserve wallet
        const currentProverConfig = this.proverConfig; // Preserve prover config
        this.miningResult = null;
        this.utxo = null;
        this.transaction = null;
        this.broadcastResult = null;
        this.signedTransactions = null;
        this.currentStep = 1;
        this.completedSteps = [];
        this.stopMonitoring();

        // Keep wallet and prover config intact
        this.wallet = currentWallet;
        this.proverConfig = currentProverConfig;

        // Save the reset state
        this.saveCurrentStep();
        this.saveCompletedSteps();

        this.emit('stepChanged', {
            step: this.currentStep,
            enabled: true,
            completedSteps: this.completedSteps
        });
        console.log('[AppState] partialReset completed');
    }

    getState() {
        return {
            hasWallet: !!this.wallet,
            hasMiningResult: !!this.miningResult,
            hasUtxo: !!this.utxo,
            hasTransaction: !!this.transaction,
            hasBroadcastResult: !!this.broadcastResult,
            hasSignedTransactions: !!this.signedTransactions,
            currentStep: this.currentStep,
            completedSteps: this.completedSteps,
            isMonitoring: this.isMonitoring,
            canStartMining: this.canStartMining(),
            canCreateTransaction: this.canCreateTransaction(),
            canStartMonitoring: this.canStartMonitoring(),
            steps: this.STEPS
        };
    }

    setCurrentStep(step) {
        console.log(`[AppState] setCurrentStep: ${this.currentStep} -> ${step}`);
        this.currentStep = step;
        this.saveCurrentStep();
    }

    // Prover configuration management methods
    updateProverConfig(config) {
        this.proverConfig = { ...this.proverConfig, ...config };
        try {
            localStorage.setItem('bro_prover_config', JSON.stringify(this.proverConfig));
            console.log('[AppState] Prover config saved:', this.proverConfig);
        } catch (error) {
            console.warn('[AppState] Failed to save prover config:', error);
        }
    }

    getProverConfig() {
        return { ...this.proverConfig };
    }
}

window.AppState = AppState;
