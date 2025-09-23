/**
 * STATE INITIALIZER - Handles page refresh initialization
 * 
 * This class is responsible for:
 * 1. Loading all data from localStorage after page refresh
 * 2. Determining the correct current step based on available data
 * 3. Initializing the UI to match the loaded state
 * 4. Ensuring the page looks exactly as it was before refresh
 */
import { StorageUtils } from './utils/storage-utils.js';

export class StateInitializer {
    constructor(appState) {
        this.appState = appState;
    }

    /**
     * MAIN INITIALIZATION - Called after page refresh
     * This should restore the exact state the user was in
     */
    initializeFromStorage() {
        console.log('[StateInitializer] Starting initialization from localStorage');
        
        // 1. Load all step data
        this.loadStepData();
        
        // 2. Determine current step based on data
        const currentStep = this.determineCurrentStep();
        
        // 3. Initialize the correct step
        this.initializeStep(currentStep);
        
        console.log('[StateInitializer] Initialization completed - Current step:', currentStep);
    }

    /**
     * LOAD ALL STEP DATA from localStorage
     */
    loadStepData() {
        console.log('[StateInitializer] Loading step data from localStorage');
        
        // Load each step's data
        this.appState.step1.load();
        this.appState.step2.load();
        this.appState.step3.load();
        
        // Load other app data
        this.loadAppData();
    }

    /**
     * LOAD OTHER APP DATA (broadcast, signed transactions, etc.)
     */
    loadAppData() {
        // Load broadcast result
        this.appState.broadcastResult = StorageUtils.load('bro_broadcast_data', null);
        
        // Load signed transactions
        this.appState.signedTransactions = StorageUtils.load('bro_signed_transactions', null);
        
        // Load prover config
        this.appState.proverConfig = StorageUtils.load('bro_prover_config', {
            isCustomProverMode: false,
            customProverUrl: ''
        });
    }

    /**
     * DETERMINE CURRENT STEP based on available data
     * This is the logic that decides where the user should be
     */
    determineCurrentStep() {
        console.log('[StateInitializer] Determining current step based on data');
        
        // Check data availability
        const hasWallet = !!this.appState.wallet;
        const hasUtxo = !!this.appState.utxo;
        const hasTransaction = !!this.appState.transaction;
        const hasBroadcast = !!this.appState.broadcastResult;
        const hasSignedTransactions = !!this.appState.signedTransactions;
        const canCreateTransaction = this.appState.canCreateTransaction();
        
        console.log('[StateInitializer] Data check:', {
            hasWallet,
            hasUtxo,
            hasTransaction,
            hasBroadcast,
            hasSignedTransactions,
            canCreateTransaction
        });

        // Determine step based on data progression
        if (hasSignedTransactions) {
            return 6; // Visit Wallet
        } else if (hasBroadcast) {
            return 5; // Claim Tokens
        } else if (hasTransaction) {
            return 4; // Broadcast
        } else if (canCreateTransaction) {
            return 3; // Transaction Creation
        } else if (hasWallet && hasUtxo) {
            return 2; // Mining
        } else if (hasWallet) {
            return 1; // Wallet Creation (waiting for UTXO)
        } else {
            return 1; // Wallet Creation (start)
        }
    }

    /**
     * INITIALIZE THE DETERMINED STEP
     * This activates the correct step and sets up the UI
     */
    initializeStep(stepNumber) {
        console.log('[StateInitializer] Initializing step', stepNumber);
        
        switch (stepNumber) {
            case 1:
                this.initializeStep1();
                break;
            case 2:
                this.initializeStep2();
                break;
            case 3:
                this.initializeStep3();
                break;
            case 4:
                this.initializeStep4();
                break;
            case 5:
                this.initializeStep5();
                break;
            case 6:
                this.initializeStep6();
                break;
            default:
                console.warn('[StateInitializer] Unknown step:', stepNumber);
                this.initializeStep1();
        }
    }

    /**
     * STEP-SPECIFIC INITIALIZATION METHODS
     */
    initializeStep1() {
        console.log('[StateInitializer] Initializing Step 1 - Wallet Creation');
        
        if (this.appState.wallet && this.appState.utxo) {
            // Should not be here, but handle gracefully
            this.appState.step2.enable();
        } else if (this.appState.wallet) {
            // Wallet exists, waiting for UTXO - start monitoring
            this.appState.currentStep = 1;
            this.appState.saveCurrentStep();
            // UI should show wallet info and start monitoring
        } else {
            // No wallet - show creation options
            this.appState.currentStep = 1;
            this.appState.saveCurrentStep();
        }
    }

    initializeStep2() {
        console.log('[StateInitializer] Initializing Step 2 - Mining');
        this.appState.step2.enable();
    }

    initializeStep3() {
        console.log('[StateInitializer] Initializing Step 3 - Transaction Creation');
        this.appState.step3.enable();
    }

    initializeStep4() {
        console.log('[StateInitializer] Initializing Step 4 - Broadcast');
        this.appState.step3.complete(); // This enables step 4
    }

    initializeStep5() {
        console.log('[StateInitializer] Initializing Step 5 - Claim Tokens');
        this.appState.currentStep = 5;
        this.appState.saveCurrentStep();
        // Mark previous steps as completed
        this.appState.completedSteps = [1, 2, 3, 4];
        this.appState.saveCompletedSteps();
    }

    initializeStep6() {
        console.log('[StateInitializer] Initializing Step 6 - Visit Wallet');
        this.appState.currentStep = 6;
        this.appState.saveCurrentStep();
        // Mark all steps as completed
        this.appState.completedSteps = [1, 2, 3, 4, 5];
        this.appState.saveCompletedSteps();
    }
}
