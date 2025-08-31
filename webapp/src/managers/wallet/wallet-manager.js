import { WalletInitializer } from './wallet-initializer.js';
import { WalletEventHandlers } from './wallet-event-handlers.js';
import { WalletUIController } from './wallet-ui-controller.js';
import { WalletFundingMonitor } from './wallet-funding-monitor.js';

/**
 * WalletManager - Main coordinator for wallet functionality
 * Delegates responsibilities to specialized modules
 */
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

    /**
     * Initialize wallet manager and check for existing wallets
     */
    async initialize() {
        await this.initializer.checkExistingWallet();
        this.eventHandlers.setupEventListeners();
    }

    /**
     * Show wallet information and start funding monitoring
     */
    showWalletInfo(walletData) {
        this.uiController.showWalletInfo(walletData);
        if (this.isFlowCompleted()) return;
        this.startFundingMonitoringWithDelay();
    }

    /**
     * Show imported wallet information and start funding monitoring
     */
    showImportedWalletInfo(walletData) {
        this.uiController.showImportedWalletInfo(walletData);
        if (this.isFlowCompleted()) return;
        this.startFundingMonitoringWithDelay();
    }

    /**
     * Start monitoring for funding
     */
    startFundingMonitoring() {
        this.fundingMonitor.startFundingMonitoring();
    }

    /**
     * Determine if the flow is already completed or has tx/broadcast data
     */
    isFlowCompleted() {
        const steps = this.appState.STEPS;
        return this.appState.isStepCompleted(steps.BROADCAST)
            || this.appState.isStepCompleted(steps.CLAIM_TOKENS)
            || this.appState.isStepCompleted(steps.VISIT_WALLET)
            || !!this.appState.transaction
            || !!this.appState.broadcastResult;
    }

    /**
     * Start UTXO monitoring after a short delay to allow UI to render
     */
    startFundingMonitoringWithDelay() {
        setTimeout(() => {
            this.startFundingMonitoring();
        }, 100);
    }

    /**
     * Reset to initial state
     */
    resetToInitialState() {
        this.uiController.resetToInitialState();
    }

    /**
     * Show UTXO found (for backward compatibility)
     */
    showUtxoFound(utxo) {
        this.uiController.showUtxoFound(utxo);
    }
}
