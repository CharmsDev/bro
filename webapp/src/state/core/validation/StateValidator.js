/**
 * State Validator - Validates and maintains state consistency
 * Clean validation logic separated from main AppState
 */
export class StateValidator {
    constructor(appState) {
        this.appState = appState;
    }

    /**
     * Validate that the state is consistent and fix any inconsistencies
     */
    validateStateConsistency() {
        // If we don't have a wallet, reset to step 1
        if (!this.appState.walletDomain.wallet) {
            this.appState.stepCoordinator.setCurrentStep(1);
            this.appState.stepCoordinator.completedSteps = [];
            this.appState.saveCurrentStep();
            return;
        }

        // If we have wallet but no UTXO, stay on step 1
        if (this.appState.walletDomain.wallet && !this.appState.walletDomain.utxo) {
            this.appState.stepCoordinator.setCurrentStep(1);
            if (!this.appState.stepCoordinator.completedSteps.includes(1)) {
                this.appState.stepCoordinator.completedSteps.push(1);
            }
            this.appState.saveCurrentStep();
            return;
        }

        // Continue with normal progression
        this.recalculateCurrentStep();
    }

    /**
     * Recalculate current step based on available data
     */
    recalculateCurrentStep() {
        let calculatedStep = 1;
        let calculatedCompleted = [];

        // Step 1: Wallet creation
        if (this.appState.walletDomain.wallet && this.appState.walletDomain.utxo) {
            calculatedCompleted.push(1);
            calculatedStep = 2;
        }

        // Step 2: Mining
        if (this.appState.miningDomain.miningResult) {
            calculatedCompleted.push(2);
            calculatedStep = 3;
        }

        // Step 3: Transaction creation
        if (this.appState.transactionDomain.transaction) {
            calculatedCompleted.push(3);
            calculatedStep = 4;
        }

        // Step 4: Broadcast
        if (this.appState.broadcastDomain.broadcastResult) {
            calculatedCompleted.push(4);
            calculatedStep = 5;
        }

        // Step 5: Minting (signing)
        if (this.appState.mintingDomain.signedTransactions) {
            calculatedCompleted.push(5);
            calculatedStep = 6;
        }

        // Update if different
        if (calculatedStep !== this.appState.stepCoordinator.getCurrentStep() || 
            JSON.stringify(calculatedCompleted) !== JSON.stringify(this.appState.stepCoordinator.completedSteps)) {
            
            this.appState.stepCoordinator.setCurrentStep(calculatedStep);
            this.appState.stepCoordinator.completedSteps = calculatedCompleted;
            this.appState.saveCurrentStep();
            
            this.appState.emit('stepChanged', {
                step: calculatedStep,
                enabled: true,
                completedSteps: calculatedCompleted
            });
        }
    }

    /**
     * Clean up stale data from localStorage
     */
    cleanupStaleData() {
        try {
            const transactionData = localStorage.getItem('bro_transaction_data');
            if (transactionData) {
                const parsed = JSON.parse(transactionData);
                const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
                const now = Date.now();

                const isStale = parsed.timestamp && (now - parsed.timestamp) > staleThreshold;
                if (isStale) {
                    this.appState.resetManager.completeReset();
                    return;
                }
            }
        } catch (error) {
            this.appState.resetManager.completeReset();
        }
    }
}
