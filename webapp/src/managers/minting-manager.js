import { ConfirmationMonitorService } from '../services/confirmation-monitor-service.js';
import { TxProofService } from '../services/tx-proof-service.js';
import { PayloadGenerator } from '../services/prover/payload-generator.js';
import { ProverApiClient } from '../services/prover/api-client.js';
import { ScureBitcoinTransactionSigner } from '../services/transaction-signer-service.js';
import { MintingUIManager } from './minting/minting-ui-manager.js';
import { MintingDataValidator } from './minting/minting-data-validator.js';
import { MintingStepExecutor } from './minting/minting-step-executor.js';

export class MintingManager {
    constructor(appState, domElements) {
        this.appState = appState;
        this.dom = domElements;

        // Initialize services
        this.services = {
            confirmationMonitor: new ConfirmationMonitorService(),
            txProofService: new TxProofService(),
            payloadGenerator: new PayloadGenerator(),
            proverApiClient: new ProverApiClient(),
            transactionSigner: new ScureBitcoinTransactionSigner()
        };

        // Process state
        this.currentStep = 0;
        this.totalSteps = 6;
        this.cancelled = false;

        // Step definitions
        this.steps = [
            { name: 'Waiting for Confirmation', status: 'pending' },
            { name: 'Generating Block Proof', status: 'pending' },
            { name: 'Composing Payload', status: 'pending' },
            { name: 'Prover API Request', status: 'pending' },
            { name: 'Signing Transactions', status: 'pending' },
            { name: 'Broadcasting Transactions', status: 'pending' }
        ];

        // Initialize UI and step executor
        this.uiManager = new MintingUIManager(this.steps);
        this.stepExecutor = new MintingStepExecutor(this.services, this.uiManager, this.appState);

        // Process data storage
        this.miningResult = null;
        this.confirmationData = null;
        this.proofData = null;
        this.payload = null;
        this.proverResponse = null;
        this.signedTransactions = null;
        this.broadcastResults = null;
    }

    // Initialize the MintingManager
    initialize() {
        // Minting system is ready
    }

    // Execute the complete minting process
    async executeMintingProcess() {
        console.log('🚀 [MintingManager] executeMintingProcess() started');
        try {
            console.log('🔧 [MintingManager] Step 1: Preparing process data...');
            // Validate prerequisites and prepare data
            this.prepareProcessData();
            console.log('✅ [MintingManager] Process data prepared successfully');

            console.log('🔧 [MintingManager] Step 2: Initializing UI...');
            // Initialize UI
            this.uiManager.initializeUI();
            console.log('✅ [MintingManager] UI initialized successfully');

            console.log('🔧 [MintingManager] Step 3: Executing all steps...');
            // Execute each step sequentially
            await this.executeAllSteps();
            console.log('✅ [MintingManager] All steps executed successfully');

            console.log('🔧 [MintingManager] Step 4: Completing Step 5 and activating Step 6...');
            // Complete Step 5 and activate Step 6
            this.appState.completeStep(5);
            this.uiManager.showSuccess(this.broadcastResults);
            console.log('✅ [MintingManager] Step 5 completed and Step 6 activated');

            console.log('✅ [MintingManager] executeMintingProcess() completed successfully');
            return true;

        } catch (error) {
            console.error('❌ [MintingManager] executeMintingProcess() failed:', error);
            console.error('❌ [MintingManager] Error stack:', error.stack);
            this.uiManager.showError(error.message);
            return false;
        }
    }

    // Prepare data for minting process (no validation needed - already validated in previous steps)
    prepareProcessData() {
        console.log('🔍 [MintingManager] Checking transaction data...');
        console.log('🔍 [MintingManager] transactionDomain exists:', !!this.appState.transactionDomain);
        console.log('🔍 [MintingManager] transaction exists:', !!this.appState.transactionDomain?.transaction);
        console.log('🔍 [MintingManager] transaction data:', this.appState.transactionDomain?.transaction);
        
        const transaction = this.appState.transactionDomain.transaction;
        
        if (!transaction) {
            throw new Error('No transaction found in transactionDomain. Cannot proceed with minting.');
        }
        
        console.log('[MintingManager] Preparing minting data for transaction:', transaction.txid);

        // Create mining result object (no validation needed - data already validated)
        this.miningResult = {
            txid: transaction.txid,
            txHex: transaction.txHex,
            reward: transaction.reward,
            changeAmount: transaction.outputs?.[2]?.value || 0
        };
    }

    // Execute all steps in sequence
    async executeAllSteps() {
        const wallet = this.appState.walletDomain.wallet;

        // Step 1: Wait for confirmation
        this.confirmationData = await this.stepExecutor.executeStep1_waitForConfirmation(this.miningResult);

        // Step 2: Generate proof
        this.proofData = await this.stepExecutor.executeStep2_generateProof(this.miningResult, this.confirmationData);

        // Step 3: Compose payload
        console.log('[MintingManager] Starting Step 3: Compose payload');
        this.payload = await this.stepExecutor.executeStep3_composePayload(this.miningResult, this.proofData, wallet);
        console.log('[MintingManager] ✅ Step 3 completed, payload:', this.payload ? 'Generated' : 'NULL');

        // Step 4: Prover API request
        console.log('[MintingManager] Starting Step 4: Prover API request');
        this.proverResponse = await this.stepExecutor.executeStep4_proverApiRequest(this.payload);
        console.log('[MintingManager] ✅ Step 4 completed, prover response:', this.proverResponse ? 'Received' : 'NULL');
        // Validate prover response (Step 5 specific - not validated before)
        MintingDataValidator.validateProverResponse(this.proverResponse);

        // Step 5: Sign transactions
        this.signedTransactions = await this.stepExecutor.executeStep5_signTransactions(this.proverResponse, wallet, this.miningResult);
        // Validate signed transactions (Step 5 specific - not validated before)
        MintingDataValidator.validateSignedTransactions(this.signedTransactions);

        // Step 6: Broadcast transactions
        this.broadcastResults = await this.stepExecutor.executeStep6_broadcastTransactions(this.signedTransactions);

        // CRITICAL: Mark minting broadcast as completed (Step 5 -> Step 6)
        console.log('[MintingManager] Step 6 broadcast results:', this.broadcastResults);
        this.appState.mintingDomain.completeMintingBroadcast(this.broadcastResults);

        // Complete Step 5 and activate Step 6
        console.log('[MintingManager] 🎯 CALLING completeStep(5) to advance to Step 6...');
        this.appState.stepCoordinator.completeStep(5);
        console.log('[MintingManager] ✅ Step 5 completed and Step 6 activated');
        console.log('[MintingManager] 📍 Current step after completion:', this.appState.stepCoordinator.getCurrentStep());
        
        // Disable minting button and show success
        this.uiManager.showSuccess(this.broadcastResults);
        
        // Mark as completed
        this.currentStep = this.totalSteps;
    }

    // Cancel the process
    cancel() {
        this.cancelled = true;
        this.services.confirmationMonitor.cancel();
        this.uiManager.cleanup();
    }

    // Reset confirmation errors and continue monitoring
    resetConfirmationErrors() {
        if (this.services.confirmationMonitor) {
            this.services.confirmationMonitor.resetErrorState();
        }
    }

    // Cancel confirmation monitoring specifically
    cancelMonitoring() {
        if (this.services.confirmationMonitor) {
            this.services.confirmationMonitor.cancel();
        }
    }

    // Get current process status
    getStatus() {
        return {
            currentStep: this.currentStep,
            totalSteps: this.totalSteps,
            steps: this.steps,
            cancelled: this.cancelled,
            completed: this.currentStep >= this.totalSteps - 1 && this.steps[this.totalSteps - 1].status === 'completed'
        };
    }

    // Get process results
    getResults() {
        return {
            miningResult: this.miningResult,
            confirmationData: this.confirmationData,
            proofData: this.proofData,
            payload: this.payload,
            proverResponse: this.proverResponse,
            signedTransactions: this.signedTransactions,
            broadcastResults: this.broadcastResults
        };
    }

    // Cleanup resources
    cleanup() {
        this.uiManager.cleanup();
        this.cancelled = true;
    }
}
