// App Controller - main orchestrator for all modules
import { DOMElements } from './dom-elements.js';
import { StepController } from './step-controller.js';
import { WalletManager } from './wallet-manager.js';
import { MiningManager } from './mining-manager.js';
import { TransactionManager } from './transaction-manager.js';
import { UIHelpers } from './ui-helpers.js';

export class AppController {
    constructor() {
        this.modules = {};
        this.appState = null;
        this.wallet = null;
        this.txBuilder = null;
        this.miner = null;
    }

    async initialize() {
        // Initialize global modules
        this.initializeGlobalModules();

        // Initialize DOM elements manager
        this.modules.domElements = new DOMElements();

        // Initialize step controller
        this.modules.stepController = new StepController(this.modules.domElements);

        // Initialize managers
        this.modules.walletManager = new WalletManager(
            this.modules.domElements,
            this.modules.stepController,
            this.appState,
            this.wallet
        );

        this.modules.miningManager = new MiningManager(
            this.modules.domElements,
            this.modules.stepController,
            this.appState,
            this.miner
        );

        this.modules.transactionManager = new TransactionManager(
            this.modules.domElements,
            this.modules.stepController,
            this.appState,
            this.txBuilder
        );

        // Initialize UI helpers
        this.modules.uiHelpers = new UIHelpers();

        // Set up state event listeners BEFORE initializing modules
        this.setupStateEventListeners();

        // Initialize all modules
        this.modules.walletManager.initialize();
        this.modules.miningManager.initialize();
        this.modules.transactionManager.initialize();

        // Debug log
        this.logInitializationStatus();
    }

    initializeGlobalModules() {
        // Initialize global state and modules
        if (window.AppState) {
            this.appState = new window.AppState();
        }

        if (window.CharmsWallet) {
            this.wallet = new window.CharmsWallet();
        }

        if (window.BitcoinTxBuilder) {
            this.txBuilder = new window.BitcoinTxBuilder();
        }

        if (window.BitcoinMiner) {
            this.miner = new window.BitcoinMiner();
        }
    }

    setupStateEventListeners() {
        if (!this.appState) return;

        this.appState.on('walletCreated', (wallet) => {
            this.modules.walletManager.showWalletInfo(wallet);
            this.modules.stepController.enableMiningStep();
        });

        this.appState.on('miningCompleted', (result) => {
            this.modules.stepController.enableTransactionStep();
            this.modules.transactionManager.startAutomaticMonitoring();
        });

        this.appState.on('utxoFound', (utxo) => {
            this.modules.transactionManager.showUtxoFound(utxo);
            this.modules.stepController.enableTransactionCreation(this.appState);
        });

        this.appState.on('stepChanged', (data) => {
            this.modules.stepController.updateStepVisualState(data.step, data.enabled);
        });
    }

    logInitializationStatus() {
        console.log('=== APP INITIALIZED ===');
        console.log('App state:', this.appState ? this.appState.getState() : 'Not available');
        console.log('Modules loaded:', {
            wallet: !!this.wallet,
            txBuilder: !!this.txBuilder,
            miner: !!this.miner,
            appState: !!this.appState
        });
        console.log('Managers initialized:', {
            domElements: !!this.modules.domElements,
            stepController: !!this.modules.stepController,
            walletManager: !!this.modules.walletManager,
            miningManager: !!this.modules.miningManager,
            transactionManager: !!this.modules.transactionManager,
            uiHelpers: !!this.modules.uiHelpers
        });
    }

    // Public API for accessing modules
    getModule(moduleName) {
        return this.modules[moduleName];
    }

    getAppState() {
        return this.appState;
    }

    getWallet() {
        return this.wallet;
    }

    getTxBuilder() {
        return this.txBuilder;
    }

    getMiner() {
        return this.miner;
    }
}
