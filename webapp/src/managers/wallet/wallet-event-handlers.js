/**
 * WalletEventHandlers - Manages all wallet-related button event listeners
 */
export class WalletEventHandlers {
    constructor(wallet, appState, dom, miningManager, transactionManager) {
        this.wallet = wallet;
        this.appState = appState;
        this.dom = dom;
        this.miningManager = miningManager;
        this.transactionManager = transactionManager;
        
        // Store reference to this instance globally for UI controller access
        if (typeof window !== 'undefined') {
            window.walletEventHandlers = this;
        }
    }

    /**
     * Setup all wallet event listeners
     */
    setupEventListeners() {
        this.setupCreateWalletButton();
        this.setupImportWalletButton();
        this.setupImportConfirmButton();
        this.setupImportCancelButton();
        this.setupCopyAddressButton();
        this.setupShowSeedButton();
        this.setupCopySeedButton();
        this.setupCopyDirectSeedButton();
        this.setupResetWalletButton();
    }

    /**
     * Create new wallet button handler
     */
    setupCreateWalletButton() {
        const createWalletBtn = this.dom.get('createWalletBtn');
        if (createWalletBtn) {
            createWalletBtn.addEventListener('click', async () => {
                if (!this.wallet) {
                    return;
                }

                try {
                    const seedPhrase = this.wallet.generateSeedPhrase();
                    const address = await this.wallet.generateAddress(seedPhrase, 0);

                    await this.wallet.storeWallet(seedPhrase, address);
                    const walletData = { seedPhrase, address };

                    this.appState.completeWalletCreation(walletData);
                } catch (error) {
                    console.error('❌ Error creating wallet. Please try again.');
                }
            });
        }
    }

    /**
     * Import wallet button handler
     */
    setupImportWalletButton() {
        const importWalletBtn = this.dom.get('importWalletBtn');
        if (importWalletBtn) {
            importWalletBtn.addEventListener('click', () => {
                // Get UI controller from wallet manager
                const walletManager = window.walletManager;
                if (walletManager && walletManager.uiController) {
                    walletManager.uiController.showImportForm();
                }
            });
        }
    }

    /**
     * Import confirm button handler
     */
    setupImportConfirmButton() {
        const importConfirmBtn = this.dom.get('importConfirmBtn');
        if (importConfirmBtn) {
            importConfirmBtn.addEventListener('click', async () => {
                await this.handleImportWallet();
            });
        }
    }

    /**
     * Import cancel button handler
     */
    setupImportCancelButton() {
        const importCancelBtn = this.dom.get('importCancelBtn');
        if (importCancelBtn) {
            importCancelBtn.addEventListener('click', () => {
                // Get UI controller from wallet manager
                const walletManager = window.walletManager;
                if (walletManager && walletManager.uiController) {
                    walletManager.uiController.hideImportForm();
                }
            });
        }
    }

    /**
     * Handle wallet import process
     */
    async handleImportWallet() {
        if (!this.wallet) {
            return;
        }

        const walletManager = window.walletManager;
        if (!walletManager || !walletManager.uiController) {
            return;
        }

        const uiController = walletManager.uiController;
        const seedPhrase = uiController.getImportSeedPhrase();

        // Validate seed phrase
        const validation = uiController.validateSeedPhrase(seedPhrase);
        if (!validation.valid) {
            uiController.showImportError(validation.error);
            return;
        }

        try {
            // Generate address from seed phrase
            const normalizedSeedPhrase = validation.words.join(' ');
            const address = await this.wallet.generateAddress(normalizedSeedPhrase, 0);

            // Store wallet
            await this.wallet.storeWallet(normalizedSeedPhrase, address);
            const walletData = { seedPhrase: normalizedSeedPhrase, address };

            // Complete wallet creation and show imported wallet info
            this.appState.completeWalletCreation(walletData);
            uiController.showImportedWalletInfo(walletData);

        } catch (error) {
            console.error('❌ Error importing wallet:', error);
            uiController.showImportError('Failed to import wallet. Please check your seed phrase and try again.');
        }
    }

    /**
     * Copy address button handler
     */
    setupCopyAddressButton() {
        const copyAddressBtn = this.dom.get('copyAddressBtn');
        if (copyAddressBtn) {
            copyAddressBtn.addEventListener('click', async () => {
                const currentWallet = this.appState.wallet;
                if (currentWallet && this.wallet) {
                    try {
                        await this.wallet.copyToClipboard(currentWallet.address);
                        copyAddressBtn.innerHTML = '<span>✓</span>';
                        setTimeout(() => {
                            copyAddressBtn.innerHTML = '<span>📋</span>';
                        }, 2000);
                    } catch (error) {
                        // Silently handle clipboard errors
                    }
                }
            });
        }
    }

    /**
     * Show seed phrase button handler
     */
    setupShowSeedButton() {
        const showSeedBtn = this.dom.get('showSeedBtn');
        if (showSeedBtn) {
            showSeedBtn.addEventListener('click', () => {
                const currentWallet = this.appState.wallet;
                if (!currentWallet) return;

                const seedDisplayEl = this.dom.get('seedPhraseDisplay');
                const isVisible = seedDisplayEl && seedDisplayEl.style.display !== 'none';

                if (!isVisible) {
                    // Show seed phrase
                    this.dom.setText('seedPhraseText', currentWallet.seedPhrase);
                    this.dom.show('seedPhraseDisplay');
                    // Keep the copy toggle button hidden; we already have a dedicated copy button next to it
                    const copySeedBtn = this.dom.get('copySeedBtn');
                    if (copySeedBtn) copySeedBtn.style.display = 'none';
                    showSeedBtn.textContent = 'Hide Seed Phrase';
                } else {
                    // Hide seed phrase
                    this.dom.hide('seedPhraseDisplay');
                    showSeedBtn.textContent = 'Show Seed Phrase';
                }
            });
        }
    }

    /**
     * Copy seed phrase button handler
     */
    setupCopySeedButton() {
        const copySeedBtn = this.dom.get('copySeedBtn');
        if (copySeedBtn) {
            copySeedBtn.addEventListener('click', async () => {
                const currentWallet = this.appState.wallet;
                if (currentWallet && this.wallet) {
                    try {
                        await this.wallet.copyToClipboard(currentWallet.seedPhrase);
                        copySeedBtn.textContent = 'Copied!';
                        setTimeout(() => {
                            copySeedBtn.textContent = 'Copy Seed Phrase';
                        }, 2000);
                    } catch (error) {
                        // Silently handle clipboard errors
                    }
                }
            });
        }
    }

    /**
     * Copy seed phrase directly to clipboard button handler
     */
    setupCopyDirectSeedButton() {
        const copyDirectSeedBtn = this.dom.get('copyDirectSeedBtn');
        if (copyDirectSeedBtn) {
            copyDirectSeedBtn.addEventListener('click', async () => {
                const currentWallet = this.appState.wallet;
                if (currentWallet && this.wallet) {
                    try {
                        await this.wallet.copyToClipboard(currentWallet.seedPhrase);
                        copyDirectSeedBtn.textContent = 'Copied!';
                        setTimeout(() => {
                            copyDirectSeedBtn.textContent = 'Copy Seed Phrase';
                        }, 2000);
                    } catch (error) {
                        // Silently handle clipboard errors
                    }
                }
            });
        }
    }

    /**
     * Reset wallet button handler
     */
    setupResetWalletButton() {
        const resetWalletBtn = this.dom.get('resetWalletBtn');
        if (resetWalletBtn) {
            resetWalletBtn.addEventListener('click', () => {
                if (confirm('⚠️ This will permanently delete your current wallet and all data. Are you sure?')) {
                    this.performFullReset();
                }
            });
        }
    }

    /**
     * Perform full application reset
     */
    performFullReset() {
        localStorage.clear();

        this.appState.reset();

        // Reset managers if available
        if (this.miningManager) {
            this.miningManager.reset();
        }

        if (this.transactionManager) {
            this.transactionManager.reset();
        }

        // Reset broadcast component
        const broadcastComponent = window.broadcastComponent;
        if (broadcastComponent) {
            broadcastComponent.disableBroadcasting();
        }

        // Reset UI via the dedicated UI controller to avoid duplicated logic
        const walletManager = window.walletManager;
        if (walletManager && walletManager.uiController) {
            walletManager.uiController.resetToInitialState();
        } else {
            // Fallback: minimally hide/show key sections if UI controller is not available
            this.dom.show('walletControls');
            this.dom.hide('seedPhraseBox');
            this.dom.hide('addressMonitoringBox');
            this.dom.hide('importWalletForm');
            this.dom.hide('fundingMonitoring');
            this.dom.hide('utxoFoundDisplay');
        }

    }
}
