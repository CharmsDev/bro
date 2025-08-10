import { DOMElements } from '../managers/dom-elements.js';
import { StepController } from '../managers/step-controller.js';
import { WalletManager } from '../managers/wallet-manager.js';
import { MiningManager } from '../managers/mining-manager.js';
import { TransactionManager } from '../managers/transaction-manager.js';
import { WalletVisitManager } from '../managers/wallet-visit-manager.js';
import { Step5Manager } from '../managers/step5-manager.js';
import { UIHelpers } from '../managers/ui-helpers.js';
import { broadcastComponent } from '../components/broadcast-component.js';

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

        this.modules.walletManager = new WalletManager(
            this.modules.domElements,
            this.modules.stepController,
            this.appState,
            this.wallet,
            this.txBuilder,
            this.modules.miningManager,
            this.modules.transactionManager
        );

        this.modules.uiHelpers = new UIHelpers();
        this.modules.broadcastComponent = broadcastComponent;

        this.modules.step5Manager = new Step5Manager(
            this.appState,
            this.modules.domElements,
            this.modules.broadcastComponent
        );

        // Setup event listeners BEFORE module initialization (required for wallet loading)
        this.setupStateEventListeners();

        // Initialize all modules
        this.modules.walletManager.initialize();
        this.modules.miningManager.initialize();
        this.modules.transactionManager.initialize();
        this.modules.walletVisitManager.initialize();
        this.modules.step5Manager.initialize();

        // Initialize step system first
        this.modules.stepController.initializeSteps(this.appState);

        // Initialize broadcast component after step system to ensure proper button state
        this.modules.broadcastComponent.initialize(this.appState);

        // Setup Step 5 event listener
        this.setupStep5EventListener();

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
        });

        this.appState.on('miningCompleted', (result) => {

        });

        this.appState.on('utxoFound', (utxo) => {

        });

        this.appState.on('transactionCreated', (transaction) => {
            // Update mining button to show "Mining Disabled"
            this.modules.miningManager.updateButtonText();
            this.modules.broadcastComponent.enableBroadcasting(transaction);
        });

        this.appState.on('transactionBroadcast', (result) => {

        });

        // New unified step management
        this.appState.on('stepChanged', (data) => {
            this.modules.stepController.updateAllSteps(data.step, data.completedSteps);
        });

        this.appState.on('stepCompleted', (data) => {
            this.modules.stepController.updateAllSteps(this.appState.currentStep, data.completedSteps);
        });
    }

    setupStep5EventListener() {
        const claimTokensBtn = document.getElementById('claimTokensBtn');
        if (claimTokensBtn) {
            claimTokensBtn.addEventListener('click', async () => {
                try {
                    await this.modules.step5Manager.executeStep5Process();
                } catch (error) {
                    console.error('❌ Step 5 minting process failed:', error);
                    console.error('❌ Failed to start minting process. Please try again.');
                }
            });
            console.log('✅ Step 5 event listener configured');
        } else {
            console.warn('⚠️ Claim tokens button not found');
        }
    }

    logInitializationStatus() {
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
