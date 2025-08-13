export class AppState {
    constructor() {
        this.wallet = null;
        this.miningResult = null;
        this.utxo = null;
        this.transaction = null;
        this.broadcastResult = null;
        this.currentStep = 1;
        this.completedSteps = [];
        this.isMonitoring = false;
        this.monitoringStopFunction = null;

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
        this.loadPersistedData();
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
        return saved ? parseInt(saved) : this.STEPS.WALLET_CREATION;
    }

    saveCurrentStep() {
        localStorage.setItem('bro_current_step', this.currentStep.toString());
    }

    loadCompletedSteps() {
        const saved = localStorage.getItem('bro_completed_steps');
        return saved ? JSON.parse(saved) : [];
    }

    saveCompletedSteps() {
        localStorage.setItem('bro_completed_steps', JSON.stringify(this.completedSteps));
    }

    loadPersistedData() {
        // Load wallet data
        const walletData = localStorage.getItem('bro_wallet_data');
        if (walletData) {
            this.wallet = JSON.parse(walletData);
        }

        // Load transaction data
        const transactionData = localStorage.getItem('bro_transaction_data');
        if (transactionData) {
            this.transaction = JSON.parse(transactionData);
        }

        // Load broadcast result
        const broadcastData = localStorage.getItem('bro_broadcast_data');
        if (broadcastData) {
            this.broadcastResult = JSON.parse(broadcastData);
        }

        // Load mining result for transaction creation validation
        this.loadMiningResult();
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
                console.error('Error parsing stored mining result:', error);
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
                console.error('Error loading mining result from BitcoinMiner:', error);
            }
        }

        return null;
    }

    completeMining(result) {
        this.miningResult = result;
        this.completeStep(this.STEPS.MINING);
        this.emit('miningCompleted', result);

    }

    completeFunding(utxo) {
        this.utxo = utxo;
        this.isMonitoring = false;
        this.emit('utxoFound', utxo);

        // Emit step change to update button states
        this.emit('stepChanged', {
            step: this.currentStep,
            enabled: true,
            completedSteps: this.completedSteps
        });
    }

    completeMonitoring(utxo) {
        this.utxo = utxo;
        this.isMonitoring = false;
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
        this.broadcastResult = result;
        // Save broadcast result to localStorage
        localStorage.setItem('bro_broadcast_data', JSON.stringify(result));

        this.completeStep(this.STEPS.BROADCAST);
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
                    console.log('🧹 Detected stale transaction data, clearing localStorage...');
                    console.log('   Stale txid:', parsed.txid);
                    this.reset();
                    return;
                }
            }
        } catch (error) {
            console.warn('Error checking stale data, clearing localStorage:', error);
            this.reset();
        }
    }

    reset() {
        console.log('🧹 Clearing all localStorage data...');
        // Clear localStorage
        localStorage.removeItem('bro_current_step');
        localStorage.removeItem('bro_completed_steps');
        localStorage.removeItem('bro_wallet_data');
        localStorage.removeItem('bro_transaction_data');
        localStorage.removeItem('bro_broadcast_data');
        // Clear mining data
        localStorage.removeItem('miningProgress');
        localStorage.removeItem('miningResult');

        // Reset state
        this.wallet = null;
        this.miningResult = null;
        this.utxo = null;
        this.transaction = null;
        this.broadcastResult = null;
        this.currentStep = 1;
        this.completedSteps = [];
        this.stopMonitoring();

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
            currentStep: this.currentStep,
            completedSteps: this.completedSteps,
            isMonitoring: this.isMonitoring,
            canStartMining: this.canStartMining(),
            canCreateTransaction: this.canCreateTransaction(),
            canStartMonitoring: this.canStartMonitoring(),
            steps: this.STEPS
        };
    }
}

window.AppState = AppState;
