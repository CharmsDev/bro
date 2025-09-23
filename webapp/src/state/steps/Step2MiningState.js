import { BaseStepState } from '../core/BaseStepState.js';
import { StorageUtils } from '../utils/storage-utils.js';

export class Step2MiningState extends BaseStepState {
    constructor() {
        super(2, 'MINING');
        this.data = {
            result: null,
            progress: null,
            isRunning: false,
            mode: 'cpu'
        };
    }

    // ATOMIC STEP MANAGEMENT - Everything for Step 2 in one place
    
    // Enable Step 2 (when wallet + UTXO ready)
    enable() {
        console.log('[Step2] ENABLING - Mining step');
        
        // Update global state
        if (window.appController?.appState) {
            window.appController.appState.currentStep = 2;
            window.appController.appState.saveCurrentStep();
            
            // Mark step 1 as completed
            if (!window.appController.appState.completedSteps.includes(1)) {
                window.appController.appState.completedSteps.push(1);
                window.appController.appState.saveCompletedSteps();
            }
        }
        
        // Save step state
        this.isActive = true;
        this.save();
        
        // Update UI directly
        this.updateUI();
        this.enableMiningButton();
    }
    
    // Complete Step 2 and enable Step 3 (when mining has results)
    complete() {
        console.log('[Step2] COMPLETING - Mining finished, enabling Step 3');
        
        // Update global state
        if (window.appController?.appState) {
            window.appController.appState.currentStep = 3;
            window.appController.appState.saveCurrentStep();
            
            // Mark step 2 as completed
            if (!window.appController.appState.completedSteps.includes(2)) {
                window.appController.appState.completedSteps.push(2);
                window.appController.appState.saveCompletedSteps();
            }
        }
        
        // Save step state
        this.isCompleted = true;
        this.save();
        
        // Update UI directly
        this.updateUI();
        this.enableTransactionButton();
    }
    
    // Direct UI management
    updateUI() {
        // Update step controller
        if (window.appController?.modules?.stepController) {
            const appState = window.appController.appState;
            window.appController.modules.stepController.updateAllSteps(
                appState.currentStep, 
                appState.completedSteps
            );
        }
    }
    
    enableMiningButton() {
        const button = document.getElementById('startMining');
        if (button) {
            button.disabled = false;
            button.classList.remove('disabled');
            button.style.pointerEvents = 'auto';
            button.style.opacity = '1';
            console.log('[Step2] Mining button ENABLED');
        }
    }
    
    enableTransactionButton() {
        const button = document.getElementById('createTransaction');
        if (button) {
            button.disabled = false;
            button.classList.remove('disabled');
            button.style.pointerEvents = 'auto';
            button.style.opacity = '1';
            console.log('[Step2] Transaction button ENABLED');
        }
    }

    /*
     * MINING STATE VARIABLES - ONLY 3 VARIABLES:
     * 
     * 1. currentNonce: The current mining position (saved on stop, restored on refresh)
     * 2. bestHash: The best hash found so far (saved immediately when found)
     * 3. bestNonce: The nonce that produced the best hash (saved with bestHash)
     * 
     * currentHash: NOT saved (calculated in real-time during mining)
     * 
     * When "Stop Mining" is pressed: currentNonce is saved to localStorage
     * When page refreshes: currentNonce is restored to continue from exact position
     */

    // Simple getters/setters
    get miningResult() { return this.data.result; }
    set miningResult(value) { 
        this.data.result = value;
        this.save();
        if (value) this.emit('miningCompleted', value);
    }

    get miningProgress() { return this.data.progress; }
    set miningProgress(value) { 
        this.data.progress = value;
        this.save();
        if (value) this.emit('miningProgressUpdated', value);
    }

    get isRunning() { return this.data.isRunning; }
    set isRunning(value) { this.data.isRunning = value; }

    get mode() { return this.data.mode; }
    set mode(value) { this.data.mode = value; }

    // Simple actions
    startMining(mode = 'cpu') {
        this.mode = mode;
        this.isRunning = true;
        this.emit('miningStarted', { mode });
    }

    stopMining() {
        this.isRunning = false;
        this.emit('miningStopped', { 
            progress: this.miningProgress,
            result: this.miningResult 
        });
    }

    completeMining(result) {
        this.miningResult = result;
        this.stopMining();
        this.complete();
    }

    // Simple checks
    canAdvanceToNext() {
        const progress = this.miningProgress;
        return !!(progress && progress.bestHash && progress.bestNonce > 0);
    }

    // Check if Step2 is permanently disabled (transaction created)
    isDisabled() {
        // Check if transaction exists in the app
        if (window.appController && window.appController.appState) {
            return !!window.appController.appState.transaction;
        }
        return false;
    }

    // Simple storage - WRAPPER ONLY, doesn't interfere with existing system
    save() {
        StorageUtils.save('bro_step2', {
            isCompleted: this.isCompleted,
            isActive: this.isActive,
            timestamp: Date.now()
        });
    }

    load() {
        const saved = StorageUtils.load('bro_step2', {});
        this.isCompleted = saved.isCompleted || false;
        this.isActive = saved.isActive || false;
        
        // SYNC WITH BitcoinMiner - don't interfere, just read
        if (window.BitcoinMiner) {
            const miner = new window.BitcoinMiner();
            this.data.result = miner.loadMiningResult();
            this.data.progress = miner.loadMiningProgress();
        }
        
        // Auto-complete if we have results
        if (this.canAdvanceToNext()) {
            this.isCompleted = true;
        }
        
        return !!(this.data.result || this.data.progress);
    }

    reset() {
        this.stopMining();
        this.data = { result: null, progress: null, isRunning: false, mode: 'cpu' };
        this.isCompleted = false;
        this.isActive = false;
        StorageUtils.remove('bro_step2');
        // Don't clear BitcoinMiner keys - let BitcoinMiner handle its own storage
    }

    partialReset() {
        this.data.result = null;
        this.isCompleted = false;
        this.stopMining();
        this.save();
    }

    // Legacy compatibility methods
    getMiningResult() { return this.miningResult; }
    setMiningResult(value) { this.miningResult = value; }
    getMiningProgress() { return this.miningProgress; }
    setMiningProgress(value) { this.miningProgress = value; }
    hasMiningResult() { return !!this.miningResult; }
    hasMiningProgress() { return !!this.miningProgress; }
    hasBestHashAndNonce() { return this.canAdvanceToNext(); }
    loadFromStorage() { return this.load(); }
    saveToStorage() { this.save(); }
    forceImmediateSave() { this.save(); }
}
