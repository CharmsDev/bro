import { DOMElements } from '../managers/dom-elements.js';
import { StepController } from '../managers/step-controller.js';
import { WalletManager } from '../managers/wallet-manager.js';
import { MiningManager } from '../managers/mining-manager.js';
import { TransactionManager } from '../managers/transaction-manager.js';
import { WalletVisitManager } from '../managers/wallet-visit-manager.js';
import { UIHelpers } from '../managers/ui-helpers.js';

export class AppController {
    constructor() {
        this.modules = {};
        this.appState = null;
        this.wallet = null;
        this.txBuilder = null;
        this.miner = null;
    }

    async initialize() {
        this.initializeGlobalModules();

        this.modules.domElements = new DOMElements();

        this.modules.stepController = new StepController(this.modules.domElements);

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

        this.modules.walletVisitManager = new WalletVisitManager(
            this.modules.domElements,
            this.modules.stepController,
            this.appState
        );

        this.modules.transactionManager = new TransactionManager(
            this.modules.domElements,
            this.modules.stepController,
            this.appState,
            this.txBuilder,
            this.modules.walletVisitManager
        );

        this.modules.uiHelpers = new UIHelpers();

        // Setup event listeners before module initialization
        this.setupStateEventListeners();

        this.modules.walletManager.initialize();
        this.modules.miningManager.initialize();
        this.modules.transactionManager.initialize();
        this.modules.walletVisitManager.initialize();

        this.logInitializationStatus();
    }

    initializeGlobalModules() {
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
            walletVisitManager: !!this.modules.walletVisitManager,
            uiHelpers: !!this.modules.uiHelpers
        });
    }

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
