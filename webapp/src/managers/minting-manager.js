import { ConfirmationMonitorService } from '../services/confirmation-monitor-service.js';
import { TxProofService } from '../services/tx-proof-service.js';
import { ProverApiService } from '../services/prover-api-service.js';
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
            proverApiService: new ProverApiService(),
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
        this.stepExecutor = new MintingStepExecutor(this.services, this.uiManager);

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
        try {
            // Validate prerequisites and prepare data
            this.prepareProcessData();

            // Initialize UI
            this.uiManager.initializeForFreshStart();

            // Execute each step sequentially
            await this.executeAllSteps();

            this.appState.completeStep(5);
            this.uiManager.showSuccess(this.broadcastResults);

            return true;

        } catch (error) {
            this.uiManager.showError(error.message);
            return false;
        }
    }

    // Prepare and validate all required data
    prepareProcessData() {
        const state = this.appState.getState();
        const transaction = this.appState.transaction;
        const broadcastResult = this.appState.broadcastResult;


        // Validate prerequisites
        MintingDataValidator.validatePrerequisites(state, transaction, broadcastResult);

        // Create and validate mining result
        this.miningResult = MintingDataValidator.createMiningResult(transaction, this.appState);
        MintingDataValidator.validateMiningResult(this.miningResult);

    }

    // Execute all steps in sequence
    async executeAllSteps() {
        const wallet = this.appState.wallet;
        MintingDataValidator.validateWalletData(wallet);

        // Step 1: Wait for confirmation
        this.confirmationData = await this.stepExecutor.executeStep1_waitForConfirmation(this.miningResult);
        MintingDataValidator.validateConfirmationData(this.confirmationData);

        // Step 2: Generate proof
        this.proofData = await this.stepExecutor.executeStep2_generateProof(this.miningResult, this.confirmationData);
        MintingDataValidator.validateProofData(this.proofData);

        // Step 3: Compose payload
        this.payload = await this.stepExecutor.executeStep3_composePayload(this.miningResult, this.proofData, wallet);

        // Step 4: Prover API request
        this.proverResponse = await this.stepExecutor.executeStep4_proverApiRequest(this.payload);
        MintingDataValidator.validateProverResponse(this.proverResponse);

        // Step 5: Sign transactions
        this.signedTransactions = await this.stepExecutor.executeStep5_signTransactions(this.proverResponse, wallet, this.miningResult);
        MintingDataValidator.validateSignedTransactions(this.signedTransactions);

        console.log('🔥 SIGNED TRANSACTIONS OUTPUT:');
        console.log('📝 Commit Transaction Hex:');
        console.log(this.signedTransactions.find(tx => tx.type === 'commit').signedHex);
        console.log('📝 Bitcoin CLI Test Command:');
        console.log(`bitcoin-cli testmempoolaccept '["${this.signedTransactions.find(tx => tx.type === 'commit').signedHex}","${this.signedTransactions.find(tx => tx.type === 'spell').signedHex}"]'`);
        
        // Execute Step 6 (Broadcasting)
        this.broadcastResults = await this.stepExecutor.executeStep6_broadcastTransactions(this.signedTransactions);

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
