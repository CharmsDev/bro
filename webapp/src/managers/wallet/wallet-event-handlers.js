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
    }

    /**
     * Setup all wallet event listeners
     */
    setupEventListeners() {
        this.setupCreateWalletButton();
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
                    const address = await this.wallet.generateTestnet4Address(seedPhrase, 0);

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

        // Reset UI to show wallet creation buttons
        this.resetUIToInitialState();

    }

    /**
     * Reset UI to initial wallet creation state
     */
    resetUIToInitialState() {
        // Show wallet creation buttons
        this.dom.show('walletControls');

        // Hide wallet boxes
        this.dom.hide('seedPhraseBox');
        this.dom.hide('addressMonitoringBox');

        // Hide funding monitoring
        this.dom.hide('fundingMonitoring');
        this.dom.hide('utxoFoundDisplay');

        // Reset seed phrase display
        this.dom.hide('seedPhraseDisplay');
        const showSeedBtn = this.dom.get('showSeedBtn');
        const copySeedBtn = this.dom.get('copySeedBtn');
        if (showSeedBtn) {
            showSeedBtn.style.display = 'inline-block';
            showSeedBtn.textContent = 'Show Seed Phrase';
        }
        if (copySeedBtn) copySeedBtn.style.display = 'none';

        // Clear displayed data
        this.dom.setText('walletAddress', 'Loading...');
        this.dom.setText('seedPhraseText', 'Loading...');
        this.dom.setText('foundUtxoTxid', '-');
        this.dom.setText('foundUtxoVout', '-');
        this.dom.setText('foundUtxoAmount', '-');
        this.dom.setText('fundingStatus', 'Waiting for funds...');

        // Show address note again
        const addressNote = document.querySelector('.address-note');
        if (addressNote) addressNote.style.display = 'block';
    }
}
