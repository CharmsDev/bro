/**
 * WalletFundingMonitor - Handles UTXO monitoring and funding detection
 */
export class WalletFundingMonitor {
    constructor(appState, txBuilder, uiController) {
        this.appState = appState;
        this.txBuilder = txBuilder;
        this.uiController = uiController;
    }

    /**
     * Start monitoring for funding on the current wallet address
     */
    startFundingMonitoring() {
        if (!this.appState.wallet || !this.txBuilder) {
            console.error('Cannot start funding monitoring: missing wallet or txBuilder');
            return;
        }

        // Do not start monitoring if the flow is already completed or we already have tx/broadcast data
        const steps = this.appState.STEPS;
        const isCompletedFlow = this.appState.isStepCompleted(steps.BROADCAST)
            || this.appState.isStepCompleted(steps.CLAIM_TOKENS)
            || this.appState.isStepCompleted(steps.VISIT_WALLET)
            || !!this.appState.transaction
            || !!this.appState.broadcastResult;
        if (isCompletedFlow) {
            return;
        }

        // Check if we already have a UTXO - if so, don't monitor again
        if (this.appState.utxo) {
            // UTXO already exists, ensure we're on Step 2 or later
            if (!this.appState.isStepCompleted(this.appState.STEPS.WALLET_CREATION)) {
                this.appState.completeStep(this.appState.STEPS.WALLET_CREATION);
            }
            this.uiController.showUtxoFound(this.appState.utxo);
            return;
        }

        const currentWallet = this.appState.wallet;
        
        // Ensure we're using the primary address (index 0) for monitoring
        const monitoringAddress = currentWallet.addresses ? currentWallet.addresses[0].address : currentWallet.address;

        // Show monitoring UI
        this.uiController.showFundingMonitoring();

        const stopFunction = this.txBuilder.monitorAddress(
            monitoringAddress,
            (utxo) => this.handleUtxoFound(utxo),
            (status) => this.handleStatusUpdate(status),
            (error) => this.handleMonitoringError(error)
        );

        this.appState.startMonitoring(stopFunction);
    }

    /**
     * Handle UTXO found callback
     */
    handleUtxoFound(utxo) {
        // 1. Stop monitoring immediately
        this.appState.stopMonitoring();
        
        // 2. Save UTXO to localStorage
        try {
            localStorage.setItem('bro_utxo_data', JSON.stringify(utxo));
        } catch (error) {
            console.error('❌ [FundingMonitor] Failed to save UTXO to localStorage:', error);
        }
        
        // 3. Complete Step 1 and advance to Step 2
        this.appState.completeStep(this.appState.STEPS.WALLET_CREATION);
        
        // 4. Update app state with UTXO
        this.appState.utxo = utxo;
        
        // 5. Show UTXO in UI
        this.uiController.showUtxoFound(utxo);
        
        // 6. Emit events for UI updates
        this.appState.emit('utxoFound', utxo);
    }

    /**
     * Handle status update callback
     */
    handleStatusUpdate(status) {
        this.uiController.updateFundingStatus(status.message);
    }

    /**
     * Handle monitoring error callback
     */
    handleMonitoringError(error) {
        console.error('Funding monitoring error:', error);
        this.uiController.showFundingError(error);
    }
}
