import { WalletInitializer } from './wallet-initializer.js';
import { WalletEventHandlers } from './wallet-event-handlers.js';
import { WalletUIController } from './wallet-ui-controller.js';
import { WalletFundingMonitor } from './wallet-funding-monitor.js';

// WalletManager - Main coordinator for wallet functionality
// Delegates responsibilities to specialized modules
export class WalletManager {
    constructor(domElements, stepController, appState, wallet, txBuilder = null, miningManager = null, transactionManager = null) {
        this.dom = domElements;
        this.stepController = stepController;
        this.appState = appState;
        this.wallet = wallet;
        this.txBuilder = txBuilder;
        this.miningManager = miningManager;
        this.transactionManager = transactionManager;

        // Initialize specialized modules
        this.initializer = new WalletInitializer(wallet, appState, domElements);
        this.eventHandlers = new WalletEventHandlers(wallet, appState, domElements, miningManager, transactionManager);
        this.uiController = new WalletUIController(domElements, stepController, appState);
        this.fundingMonitor = new WalletFundingMonitor(appState, txBuilder, this.uiController);
        
        // Store reference globally for UI controller access
        if (typeof window !== 'undefined') {
            window.walletManager = this;
        }
    }

    // Initialize wallet manager and check for existing wallets
    async initialize() {
        await this.initializer.checkExistingWallet();
        this.eventHandlers.setupEventListeners();
    }

    // Show wallet information and start funding monitoring
    showWalletInfo(walletData) {
        this.uiController.showWalletInfo(walletData);
        
        const isCompleted = this.isFlowCompleted();
        console.log('[WalletManager] Flow completion check:', {
            isCompleted,
            currentStep: this.appState.stepCoordinator.getCurrentStep(),
            completedSteps: this.appState.stepCoordinator.completedSteps,
            hasTransaction: this.appState.transactionDomain.hasTransaction(),
            hasBroadcast: this.appState.broadcastDomain.hasBroadcastResult()
        });
        
        if (isCompleted) {
            console.log('[WalletManager] Flow already completed, skipping funding monitoring');
            return;
        }
        
        this.startFundingMonitoringWithDelay();
    }

    // Show imported wallet information and start funding monitoring
    showImportedWalletInfo(walletData) {
        this.uiController.showImportedWalletInfo(walletData);
        if (this.isFlowCompleted()) return;
        this.startFundingMonitoringWithDelay();
    }

    // Start monitoring for funding
    startFundingMonitoring() {
        this.fundingMonitor.startFundingMonitoring();
    }

    // Determine if the flow is already completed or has tx/broadcast data
    isFlowCompleted() {
        const currentStep = this.appState.stepCoordinator.getCurrentStep();
        const hasTransaction = this.appState.transactionDomain.hasTransaction();
        const hasBroadcast = this.appState.broadcastDomain.hasBroadcastResult();
        const hasUtxo = this.appState.walletDomain.hasUtxo();
        
        // Only skip monitoring if we have UTXO AND (transaction OR broadcast)
        // OR if we're past Step 2 (mining completed)
        return (hasUtxo && (hasTransaction || hasBroadcast)) || currentStep > 2;
    }

    // Start UTXO monitoring after a short delay to allow UI to render
    startFundingMonitoringWithDelay() {
        setTimeout(() => {
            this.startFundingMonitoring();
        }, 100);
    }

    // Reset to initial state
    resetToInitialState() {
        this.uiController.resetToInitialState();
    }

    // Show UTXO found
    showUtxoFound(utxo) {
        this.uiController.showUtxoFound(utxo);
    }
}
