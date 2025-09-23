import { StateManager } from '../state/core/StateManager.js';
import { Step1WalletState } from '../state/steps/Step1WalletState.js';
import { Step2MiningState } from '../state/steps/Step2MiningState.js';
import { Step3TransactionState } from '../state/steps/Step3TransactionState.js';
import { StateInitializer } from '../state/StateInitializer.js';

export class AppState {
    constructor() {
        // NEW MODULAR ARCHITECTURE
        this.stateManager = new StateManager();
        this.step1 = new Step1WalletState();
        this.step2 = new Step2MiningState();
        this.step3 = new Step3TransactionState();
        
        // Register steps with state manager
        this.stateManager.registerStep(this.step1);
        this.stateManager.registerStep(this.step2);
        this.stateManager.registerStep(this.step3);
        
        // Initialize state initializer
        this.stateInitializer = new StateInitializer(this);
        
        // LEGACY PROPERTIES (will be migrated step by step)
        this.broadcastResult = null;
        this.signedTransactions = null;
        this.currentStep = 1;
        this.completedSteps = [];
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
            stepChanged: [],
            step2Disabled: []
        };

        // Setup step event listeners
        this.setupStepEventListeners();
        
        // Initialize state from localStorage
        this.currentStep = this.loadCurrentStep();
        this.completedSteps = this.loadCompletedSteps();
        this.cleanupStaleData();
        this.loadFromStorage();
    }

    // COMPATIBILITY PROPERTIES - Delegate to Step1
    get wallet() { return this.step1.getWallet(); }
    set wallet(value) { 
        if (value) {
            this.step1.setWallet(value);
        }
    }

    get utxo() { return this.step1.getUtxo(); }
    set utxo(value) { 
        if (value) {
            this.step1.setUtxo(value);
        }
    }

    get isMonitoring() { return this.step1.isMonitoring; }
    set isMonitoring(value) { this.step1.isMonitoring = value; }

    // COMPATIBILITY PROPERTIES - Delegate to Step2
    get miningResult() { return this.step2.getMiningResult(); }
    set miningResult(value) { 
        if (value) {
            this.step2.setMiningResult(value);
        }
    }

    // COMPATIBILITY PROPERTIES - Delegate to Step3
    get transaction() { return this.step3.getTransaction(); }
    set transaction(value) { 
        if (value) {
            this.step3.setTransaction(value);
        }
    }

    // Setup event listeners between steps and legacy system
    setupStepEventListeners() {
        // Step 1 events
        this.step1.on('walletCreated', (data) => {
            this.emit('walletCreated', data);
        });
        
        this.step1.on('utxoFound', (data) => {
            this.emit('utxoFound', data);
        });
        
        this.step1.on('readyForMining', (data) => {
            // Step 1 completed, advance to step 2
            this.setCurrentStep(this.STEPS.MINING);
        });

        // Step 2 events
        this.step2.on('miningCompleted', (data) => {
            this.emit('miningCompleted', data);
        });
        
        this.step2.on('miningProgressUpdated', (data) => {
            // Force immediate save for GPU mining fix
            this.step2.forceImmediateSave();
        });
        
        this.step2.on('miningStopped', (data) => {
            // When mining stops with results, enable Step 3
            if (data.progress && data.progress.bestHash && data.progress.bestNonce > 0) {
                this.enableStep3();
            }
        });

        // Step 3 events
        this.step3.on('transactionCreated', (data) => {
            this.emit('transactionCreated', data);
        });
        
        this.step3.on('disableStep2', () => {
            // CRITICAL: When transaction is created, Step 2 is permanently disabled
            this.step2.isRunning = false; // Stop any running mining
            this.emit('step2Disabled');
            
            // Force mining manager to update button state
            this.emit('transactionCreated', this.step3.getTransaction());
        });

        // State manager events
        this.stateManager.on('stepChanged', (data) => {
            this.currentStep = data.currentStep;
            this.completedSteps = data.completedSteps;
            this.emit('stepChanged', data);
        });
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
        // SIMPLIFIED: Use StateInitializer for clean initialization
        this.stateInitializer.initializeFromStorage();
    }

    // ATOMIC STEP INITIALIZATION - Each step decides if it should be active
    initializeStepsFromData() {
        console.log('[AppState] Initializing steps from data');
        
        // Check what data we have and enable appropriate step
        if (this.transaction) {
            // Transaction exists - Step 4 should be active
            this.step3.complete();
        } else if (this.canCreateTransaction()) {
            // Mining has results - Step 3 should be active
            this.step3.enable();
        } else if (this.wallet && this.utxo) {
            // Wallet + UTXO ready - Step 2 should be active
            this.step2.enable();
        } else {
            // Default to Step 1
            this.currentStep = this.STEPS.WALLET_CREATION;
            this.saveCurrentStep();
        }
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
            console.log('[AppState] recalculateCurrentStep - updating from step', this.currentStep, 'to', calculatedStep);
            console.log('[AppState] recalculateCurrentStep - completedSteps:', calculatedCompleted);
            this.currentStep = calculatedStep;
            this.completedSteps = calculatedCompleted;
            this.saveCurrentStep();
            this.saveCompletedSteps();
            
            // CRITICAL: Emit stepChanged event so UI updates
            this.emit('stepChanged', {
                step: this.currentStep,
                enabled: true,
                completedSteps: this.completedSteps
            });
        } else {
        }
    }

    // MIGRATED TO STEP2 - Mining result loading now handled by Step2MiningState

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

    // MIGRATED TO STEP1 - Delegate to Step1WalletState
    completeWalletCreation(wallet) {
        this.step1.completeWalletCreation(wallet);
    }

    // MIGRATED TO STEP2 - Delegate to Step2MiningState
    completeMining(result) {
        this.step2.completeMining(result);
    }

    // MIGRATED TO STEP1 - Delegate to Step1WalletState
    completeFunding(utxo) {
        this.step1.completeFunding(utxo);
    }

    // MIGRATED TO STEP1 - Delegate to Step1WalletState  
    completeMonitoring(utxo) {
        this.step1.completeFunding(utxo);
    }

    // ATOMIC: Step3 handles transaction creation completion
    completeTransactionCreation(transaction) {
        this.step3.transaction = transaction; // Set the transaction data
        this.step3.complete(); // Complete step 3 and enable step 4
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
        if (this.utxo !== null && window.BitcoinMiner) {
            const miner = new window.BitcoinMiner();
            const miningProgress = miner.loadMiningProgress();
            if (miningProgress && miningProgress.bestHash && miningProgress.bestNonce > 0) {
                return true;
            }
        }
        return false;
    }

    canStartMonitoring() {
        return this.wallet !== null && this.miningResult !== null;
    }

    isMiningActive() {
        if (!window.BitcoinMiner) return false;
        const miner = new window.BitcoinMiner();
        return miner.isRunning || false;
    }

    enableStep3() {
        // ATOMIC: Step3 handles everything itself
        this.step3.enable();
    }

    disableStep3() {
        // ATOMIC: Step3 handles everything itself
        this.step3.disable();
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

    // MIGRATED TO STEP1 - Delegate to Step1WalletState
    startMonitoring(stopFunction) {
        this.step1.startMonitoring(stopFunction);
    }

    // MIGRATED TO STEP1 - Delegate to Step1WalletState
    stopMonitoring() {
        this.step1.stopMonitoring();
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

        // MIGRATED TO STEP1, STEP2 & STEP3 - Reset via modular states
        this.step1.reset();
        this.step2.reset();
        this.step3.reset();
        this.broadcastResult = null;
        this.signedTransactions = null;
        this.currentStep = 1;
        this.completedSteps = [];

        // Preserve only the prover URL, reset the rest
        this.proverConfig = { 
            isCustomProverMode: isCustomMode, 
            customProverUrl: currentProverUrl 
        };
        // stopMonitoring now handled by step1.reset()

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
        
        // MIGRATED TO STEP2 & STEP3 - Partial reset mining and transaction data
        this.step2.partialReset();
        this.step3.reset();
        // UTXO reset handled by step1 - don't reset step1 in partial reset
        this.broadcastResult = null;
        this.signedTransactions = null;
        this.currentStep = 1;
        this.completedSteps = [];
        // stopMonitoring handled by step1

        // Keep wallet and prover config intact - handled by step1 compatibility
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
            isMiningActive: this.isMiningActive(),
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
