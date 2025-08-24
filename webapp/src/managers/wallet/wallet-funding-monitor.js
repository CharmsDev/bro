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

        // Check if we already have a UTXO
        if (this.appState.utxo) {
            this.uiController.showUtxoFound(this.appState.utxo);
            return;
        }

        const currentWallet = this.appState.wallet;

        // Show monitoring UI
        this.uiController.showFundingMonitoring();

        const stopFunction = this.txBuilder.monitorAddress(
            currentWallet.address,
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
        this.uiController.showUtxoFound(utxo);
        this.appState.completeFunding(utxo);
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
