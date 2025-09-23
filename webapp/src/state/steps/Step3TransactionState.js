import { BaseStepState } from '../core/BaseStepState.js';
import { StorageUtils } from '../utils/storage-utils.js';

export class Step3TransactionState extends BaseStepState {
    constructor() {
        super(3, 'TRANSACTION_CREATION');
        this.data = {
            transaction: null
        };
    }

    // ATOMIC STEP MANAGEMENT - Everything for Step 3 in one place
    
    // Enable Step 3 (when mining has results)
    enable() {
        console.log('[Step3] ENABLING - Transaction creation step');
        
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
        this.isActive = true;
        this.save();
        
        // Update UI directly
        this.updateUI();
        this.enableTransactionButton();
    }
    
    // Disable Step 3 (when mining is active)
    disable() {
        console.log('[Step3] DISABLING - Mining is active, cannot create transaction');
        
        // Update global state - go back to Step 2
        if (window.appController?.appState) {
            window.appController.appState.currentStep = 2;
            window.appController.appState.saveCurrentStep();
        }
        
        // Save step state
        this.isActive = false;
        this.save();
        
        // Update UI directly
        this.updateUI();
        this.disableTransactionButton();
    }
    
    // Complete Step 3 and enable Step 4 (when transaction created)
    complete() {
        console.log('[Step3] COMPLETING - Transaction created, enabling Step 4');
        
        // Update global state
        if (window.appController?.appState) {
            window.appController.appState.currentStep = 4;
            window.appController.appState.saveCurrentStep();
            
            // Mark step 3 as completed
            if (!window.appController.appState.completedSteps.includes(3)) {
                window.appController.appState.completedSteps.push(3);
                window.appController.appState.saveCompletedSteps();
            }
        }
        
        // Save step state
        this.isCompleted = true;
        this.save();
        
        // Update UI directly
        this.updateUI();
        this.disableMiningButton(); // Permanently disable mining
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
    
    enableTransactionButton() {
        const button = document.getElementById('createTransaction');
        if (button) {
            button.disabled = false;
            button.classList.remove('disabled');
            button.style.pointerEvents = 'auto';
            button.style.opacity = '1';
            console.log('[Step3] Transaction button ENABLED');
        }
    }
    
    disableTransactionButton() {
        const button = document.getElementById('createTransaction');
        if (button) {
            button.disabled = true;
            button.classList.add('disabled');
            button.style.pointerEvents = 'none';
            button.style.opacity = '0.5';
            console.log('[Step3] Transaction button DISABLED');
        }
    }
    
    disableMiningButton() {
        const button = document.getElementById('startMining');
        if (button) {
            const span = button.querySelector('span');
            if (span) span.textContent = 'Mining Disabled';
            button.disabled = true;
            button.classList.add('disabled');
            button.style.pointerEvents = 'none';
            button.style.opacity = '0.5';
            console.log('[Step3] Mining button DISABLED');
        }
    }

    /*
     * TRANSACTION STATE - SIMPLE:
     * 
     * 1. transaction: The created transaction data
     * 
     * When transaction is created: Step 2 gets PERMANENTLY DISABLED
     */

    // Simple getters/setters
    get transaction() { return this.data.transaction; }
    set transaction(value) { 
        this.data.transaction = value;
        this.save();
        if (value) {
            this.emit('transactionCreated', value);
            // CRITICAL: When transaction is created, Step 2 is permanently disabled
            this.emit('disableStep2');
            
            // STOP any active mining immediately
            if (window.BitcoinMiner) {
                const miner = new window.BitcoinMiner();
                if (miner.isRunning) {
                    miner.stop();
                    console.log('[Step3] Stopped active mining due to transaction creation');
                }
            }
        }
    }

    // Simple actions
    createTransaction(transactionData) {
        this.transaction = transactionData;
        this.complete();
    }

    // Simple checks
    canAdvanceToNext() {
        return !!this.transaction;
    }

    hasTransaction() {
        return !!this.transaction;
    }

    // Simple storage - WRAPPER ONLY
    save() {
        StorageUtils.save('bro_step3', {
            transaction: this.data.transaction,
            isCompleted: this.isCompleted,
            isActive: this.isActive,
            timestamp: Date.now()
        });
        
        // Also save in old format for compatibility
        if (this.data.transaction) {
            StorageUtils.save('bro_transaction_data', this.data.transaction);
        }
    }

    load() {
        const saved = StorageUtils.load('bro_step3', {});
        this.data.transaction = saved.transaction || null;
        this.isCompleted = saved.isCompleted || false;
        this.isActive = saved.isActive || false;
        
        // Fallback to old format
        if (!this.data.transaction) {
            this.data.transaction = StorageUtils.load('bro_transaction_data', null);
        }
        
        // Auto-complete if we have transaction
        if (this.hasTransaction()) {
            this.isCompleted = true;
        }
        
        return !!this.data.transaction;
    }

    reset() {
        this.data = { transaction: null };
        this.isCompleted = false;
        this.isActive = false;
        StorageUtils.clear(['bro_step3', 'bro_transaction_data']);
    }

    // Legacy compatibility methods
    getTransaction() { return this.transaction; }
    setTransaction(value) { this.transaction = value; }
    completeTransactionCreation(value) { this.createTransaction(value); }
    loadFromStorage() { return this.load(); }
    saveToStorage() { this.save(); }
}
