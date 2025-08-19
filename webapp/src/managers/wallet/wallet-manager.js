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
        this.uiController = new WalletUIController(domElements, stepController);
        this.fundingMonitor = new WalletFundingMonitor(appState, txBuilder, this.uiController);
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

        // Start UTXO monitoring after showing wallet
        setTimeout(() => {
            this.startFundingMonitoring();
        }, 100);
    }

    /**
     * Start monitoring for funding
     */
    startFundingMonitoring() {
        this.fundingMonitor.startFundingMonitoring();
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
