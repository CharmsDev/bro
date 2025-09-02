import { DOMElements } from '../managers/dom-elements.js';
import { StepController } from '../managers/step-controller.js';
import { WalletManager } from '../managers/wallet/wallet-manager.js';
import { MiningManager } from '../managers/mining-manager.js';
import { TransactionManager } from '../managers/transaction-manager.js';
import { WalletVisitManager } from '../managers/wallet-visit-manager.js';
import { MintingManager } from '../managers/minting-manager.js';
import { UIHelpers } from '../managers/ui-helpers.js';
import { broadcastComponent } from '../components/broadcast-component.js';
import { CountdownTimer } from '../components/countdown-timer.js';

export class AppController {
    constructor() {
        this.modules = {};
        this.appState = null;
        this.wallet = null;
        this.txBuilder = null;
        this.miner = null;
        this.countdownTimer = null;
    }

    async initialize() {
        // Initialize countdown timer asynchronously (non-blocking)
        this.countdownTimer = new CountdownTimer();
        this.countdownTimer.init();

        this.initializeGlobalModules();

        this.modules.domElements = new DOMElements();

        this.modules.stepController = new StepController(this.modules.domElements);

        this.modules.miningManager = new MiningManager(
            this.modules.domElements,
            this.modules.stepController,
            this.appState,
            this.miner
        );

        this.modules.walletManager = new WalletManager(
            this.modules.domElements,
            this.modules.stepController,
            this.appState,
            this.wallet,
            this.txBuilder,
            this.modules.miningManager,
            null // Will set transactionManager after creation
        );

        // Create wallet visit manager with funding monitor
        this.modules.walletVisitManager = new WalletVisitManager(
            this.modules.domElements,
            this.modules.stepController,
            this.appState,
            this.modules.walletManager.fundingMonitor
        );

        this.modules.transactionManager = new TransactionManager(
            this.modules.domElements,
            this.modules.stepController,
            this.appState,
            this.txBuilder,
            this.modules.walletVisitManager
        );

        // Update wallet manager with transaction manager reference
        this.modules.walletManager.transactionManager = this.modules.transactionManager;

        this.modules.uiHelpers = new UIHelpers();
        this.modules.broadcastComponent = broadcastComponent;

        this.modules.mintingManager = new MintingManager(
            this.appState,
            this.modules.domElements,
            this.modules.broadcastComponent
        );

        // Expose minting manager globally for UI recovery buttons
        window.mintingManager = this.modules.mintingManager;

        // Setup event listeners BEFORE module initialization (required for wallet loading)
        this.setupStateEventListeners();

        // Initialize all modules
        this.modules.walletManager.initialize();
        this.modules.miningManager.initialize();
        this.modules.transactionManager.initialize();
        this.modules.walletVisitManager.initialize();
        this.modules.mintingManager.initialize();

        // Initialize step system first
        this.modules.stepController.initializeSteps(this.appState);

        // After steps are initialized, ensure mining success UI is restored on reload
        try {
            const miningResult = this.appState?.miningResult;
            const hasTransaction = !!this.appState?.transaction;
            if (miningResult && !hasTransaction) {
                // Repopulate the "Nice hash, bro" box with saved result
                this.modules.miningManager.restoreCompletedMining(miningResult);
            }
        } catch (_) { /* noop */ }

        // Initialize broadcast component after step system to ensure proper button state
        this.modules.broadcastComponent.initialize(this.appState);

        // Setup Step 5 event listener
        this.setupStep5EventListener();
        
        // Setup UTXO display event listener for step controller updates
        this.setupUtxoDisplayEventListener();

        // Restore Step 5 summary and enable Step 6 on reload if we already broadcasted
        try {
            const broadcastData = this.appState?.broadcastResult;
            if (broadcastData) {
                // Create Step 5 UI container if missing
                this.modules.mintingManager.uiManager.initializeForPageRefresh();
                // Enable Step 6 visit wallet button and mark section active
                this.modules.walletVisitManager.enableWalletVisitStep();
            }
        } catch (_) { /* noop */ }

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
            // Update mining button text when UTXO is found (funds received)
            this.modules.miningManager.updateButtonText();
            // Also force step controller to re-evaluate button states immediately
            this.modules.stepController.updateAllSteps(this.appState.currentStep, this.appState.completedSteps);
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
            const buttonSpan = claimTokensBtn.querySelector('span');
            const originalButtonText = buttonSpan ? buttonSpan.textContent : 'Start Minting $Bro';

            claimTokensBtn.addEventListener('click', async () => {
                if (claimTokensBtn.disabled) return;

                try {
                    // Disable button and update text immediately
                    claimTokensBtn.disabled = true;
                    claimTokensBtn.classList.add('disabled');
                    if (buttonSpan) {
                        buttonSpan.textContent = 'Minting now...';
                    }

                    await this.modules.mintingManager.executeMintingProcess();
                } catch (error) {
                    console.error('❌ Step 5 minting process failed:', error);
                    // Re-enable the button on failure so the user can retry
                    claimTokensBtn.disabled = false;
                    claimTokensBtn.classList.remove('disabled');
                    if (buttonSpan) {
                        buttonSpan.textContent = originalButtonText;
                    }
                    // Optionally, display a user-friendly error message here
                    alert('The minting process failed. Please check the console and try again.');
                }
            });
        }
    }
    
    setupUtxoDisplayEventListener() {
        if (!this.appState) return;

        this.appState.on('utxoDisplayed', () => {
            // Force update step controller to enable mining button
            setTimeout(() => {
                this.modules.stepController.updateAllSteps(
                    this.appState.currentStep, 
                    this.appState.completedSteps
                );
            }, 50);
        });
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
