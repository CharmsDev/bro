export class AppState {
    constructor() {
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
        this.currentStep = this.loadCurrentStep();
        this.completedSteps = this.loadCompletedSteps();
        this.cleanupStaleData();
        this.loadFromStorage();
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
        return currentStep;
    }

    saveCurrentStep() {
        localStorage.setItem('bro_current_step', this.currentStep.toString());
    }

    loadCompletedSteps() {
        const saved = localStorage.getItem('bro_completed_steps');
        const completedSteps = saved ? JSON.parse(saved) : [];
        return completedSteps;
    }

    saveCompletedSteps() {
        localStorage.setItem('bro_completed_steps', JSON.stringify(this.completedSteps));
    }

    loadFromStorage() {
        // Load wallet data first - everything depends on having a wallet
        const walletData = localStorage.getItem('bro_wallet_data');
        if (walletData) {
            try {
                const data = JSON.parse(walletData);
                this.wallet = data;
            } catch (error) {
                console.warn('[AppState] Invalid wallet data, resetting state');
                this.reset();
                return;
            }
        } else {
            // No wallet means we should be at step 1
            this.currentStep = this.STEPS.WALLET_CREATION;
            this.completedSteps = [];
            this.saveCurrentStep();
            this.saveCompletedSteps();
            return;
        }

        // Only load other data if we have a wallet
        // Load UTXO data
        const utxoData = localStorage.getItem('bro_utxo_data');
        if (utxoData) {
            try {
                this.utxo = JSON.parse(utxoData);
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
        } else {
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
            } catch (error) {
                console.warn('Invalid prover config data, clearing');
                localStorage.removeItem('bro_prover_config');
                this.proverConfig = { isCustomProverMode: false, customProverUrl: '' };
            }
        }

        // Load mining result for transaction creation validation
        this.loadMiningResult();

        // Validate state consistency after loading all data
        this.validateStateConsistency();
        
        // Force recalculation after all data is loaded
        this.recalculateCurrentStep();
    }

    // Validate that the state is consistent and fix any inconsistencies
    validateStateConsistency() {
        
        // If we don't have a wallet, we should be at step 1 with no completed steps
        if (!this.wallet) {
            this.currentStep = this.STEPS.WALLET_CREATION;
            this.completedSteps = [];
            this.saveCurrentStep();
            this.saveCompletedSteps();
            return;
        }

        // If we have a wallet but no UTXO, we should stay at step 1 until UTXO is found
        if (this.wallet && !this.utxo) {
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
                // Continue to recalculateCurrentStep to determine correct next step
            } else {
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

        // Check if mining is complete - check for best mining result in localStorage
        const bestHash = localStorage.getItem('bestHash11');
        const bestNonce = localStorage.getItem('bestNonce11');
        if (bestHash && bestNonce) {
            calculatedCompleted.push(this.STEPS.MINING);
            calculatedStep = this.STEPS.TRANSACTION_CREATION;
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
        if (this.currentStep !== calculatedStep || 
            JSON.stringify(this.completedSteps.sort()) !== JSON.stringify(calculatedCompleted.sort())) {
            this.currentStep = calculatedStep;
            this.completedSteps = calculatedCompleted;
            this.saveCurrentStep();
            this.saveCompletedSteps();
        } else {
        }
    }

    loadMiningResult() {
        // First try to load from localStorage directly
        const storedResult = localStorage.getItem('miningResult');
        if (storedResult) {
            try {
                const result = JSON.parse(storedResult);
                this.miningResult = result;
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
        // DO NOT save miningResult - only use current11 for nonce storage
        // this.miningResult = result;
        // localStorage.setItem('miningResult', JSON.stringify(result));
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
        // Step 4: Mining transaction broadcast completed -> advance to Step 5
        this.broadcastResult = result;
        // Save broadcast result to localStorage
        localStorage.setItem('bro_broadcast_data', JSON.stringify(result));

        // Complete Step 4 and advance to Step 5
        this.completeStep(this.STEPS.BROADCAST);
        this.setCurrentStep(this.STEPS.CLAIM_TOKENS);
        this.emit('transactionBroadcast', result);
    }

    // Step 5: Commit/Spell broadcast completed -> advance to Step 6
    completeMintingBroadcast(result) {
        this.broadcastResult = result;
        // Save final broadcast result to localStorage
        localStorage.setItem('bro_broadcast_data', JSON.stringify(result));

        // Complete Step 5 and advance to Step 6
        this.completeStep(this.STEPS.CLAIM_TOKENS);
        this.setCurrentStep(this.STEPS.VISIT_WALLET);
        this.emit('transactionBroadcast', result);
    }

    canStartMining() {
        return this.wallet !== null && this.utxo !== null;
    }

    canCreateTransaction() {
        // Check if we have mining progress with a best result (best hash + best nonce)
        if (this.utxo !== null && window.BitcoinMiner) {
            const miner = new window.BitcoinMiner();
            const miningProgress = miner.loadMiningProgress();
            // Check if we have best hash and best nonce - required for transaction creation
            if (miningProgress && miningProgress.bestHash && miningProgress.bestNonce > 0) {
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
        // Only calculate reward if we have a completed miningResult
        // Reward cannot exist without mining being completed first
        if (this.miningResult && this.miningResult.bestHash && this.miningResult.bestNonce) {
            try {
                if (window.calculateRewardInfo) {
                    const rewardInfo = window.calculateRewardInfo(this.miningResult.bestNonce, this.miningResult.bestHash);
                    return Number(rewardInfo.rawAmount);
                }
            } catch (_) {}
        }

        // No fallback to progress - reward only exists after mining completion
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
     * Clean up stale data from localStorage based on age only
     */
    cleanupStaleData() {
        try {
            const transactionData = localStorage.getItem('bro_transaction_data');
            if (transactionData) {
                const parsed = JSON.parse(transactionData);
                const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
                const now = Date.now();

                // Only check if data is older than threshold
                const isStale = parsed.timestamp && (now - parsed.timestamp) > staleThreshold;

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
        // Preserve prover URL before clearing
        const currentProverUrl = this.proverConfig?.customProverUrl || '';
        const isCustomMode = this.proverConfig?.isCustomProverMode || false;
        
        // Clear ALL localStorage except prover URL
        localStorage.removeItem('bro_current_step');
        localStorage.removeItem('bro_completed_steps');
        localStorage.removeItem('bro_wallet_data');
        localStorage.removeItem('bro_transaction_data');
        localStorage.removeItem('bro_broadcast_data');
        localStorage.removeItem('bro_signed_transactions');
        localStorage.removeItem('bro_utxo_data');
        localStorage.removeItem('bro_utxo_display_data');
        // Clear mining data - simple nonce clearing
        console.log('[AppState.reset] Clearing current11...');
        localStorage.removeItem('current11');
        localStorage.removeItem('bestHash11');
        localStorage.removeItem('bestNonce11');
        localStorage.removeItem('bestZeros11');
        localStorage.removeItem('currentNonce');
        localStorage.removeItem('miningProgress');
        localStorage.removeItem('miningResult');
        // Clear wallet service data
        localStorage.removeItem('charmsWallet');
        // Clear prover config (will be recreated with preserved URL)
        localStorage.removeItem('bro_prover_config');

        // Additionally clear any miner-managed persistence to avoid stale nonces
        try {
            if (window && window.BitcoinMiner) {
                const miner = new window.BitcoinMiner();
                console.log('[AppState.reset] Clearing miner persistence...');
                miner.clearMiningProgress();
                miner.clearMiningResult();
                console.log('[AppState.reset] Miner persistence cleared');
            }
        } catch (error) { 
            console.warn('[AppState.reset] Error clearing miner persistence:', error);
        }

        // Reset state
        this.wallet = null;
        this.miningResult = null;
        this.utxo = null;
        this.transaction = null;
        this.broadcastResult = null;
        this.signedTransactions = null;
        this.currentStep = 1;
        this.completedSteps = [];
        // Preserve only the prover URL, reset the rest
        this.proverConfig = { 
            isCustomProverMode: isCustomMode, 
            customProverUrl: currentProverUrl 
        };
        this.stopMonitoring();

        this.emit('stepChanged', {
            step: this.currentStep,
            enabled: true,
            completedSteps: this.completedSteps
        });
    }

    partialReset() {
        // Clear ALL minting-related localStorage data
        // PRESERVE: bro_wallet_data and bro_prover_config (not removed)
        localStorage.removeItem('bro_current_step');
        localStorage.removeItem('bro_completed_steps');
        try {
            if (window && window.BitcoinMiner) {
                const miner = new window.BitcoinMiner();
                console.log('[AppState.partialReset] Clearing miner persistence...');
                miner.clearMiningProgress();
                miner.clearMiningResult();
                console.log('[AppState.partialReset] Miner persistence cleared');
            }
        } catch (error) { 
            console.warn('[AppState.partialReset] Error clearing miner persistence:', error);
        }

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
        this.currentStep = step;
        this.saveCurrentStep();
    }

    // Prover configuration management methods
    updateProverConfig(config) {
        this.proverConfig = { ...this.proverConfig, ...config };
        try {
            localStorage.setItem('bro_prover_config', JSON.stringify(this.proverConfig));
        } catch (error) {
            console.warn('[AppState] Failed to save prover config:', error);
        }
    }

    getProverConfig() {
        return { ...this.proverConfig };
    }
}

window.AppState = AppState;
