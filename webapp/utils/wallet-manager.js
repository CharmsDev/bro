// Wallet Manager - handles wallet creation, display, and utilities
export class WalletManager {
    constructor(domElements, stepController, appState, wallet) {
        this.dom = domElements;
        this.stepController = stepController;
        this.appState = appState;
        this.wallet = wallet;
    }

    initialize() {
        this.checkExistingWallet();
        this.setupEventListeners();
    }

    checkExistingWallet() {
        if (!this.wallet) return;

        const existingWallet = this.wallet.getStoredWallet();
        if (existingWallet) {
            const address = existingWallet.address;
            const isValidFormat = address && (
                (address.startsWith('tb1q') && address.length === 42) ||
                (address.startsWith('tb1p') && address.length === 62)
            );

            if (isValidFormat) {
                this.appState.completeWalletCreation(existingWallet);
                console.log('Loaded existing wallet:', existingWallet);

                // Also check for existing mining result
                this.appState.loadMiningResult();
            } else {
                console.log('Found invalid wallet address format, clearing:', address);
                this.wallet.clearWallet();
                this.dom.show('walletCreation');
                this.dom.hide('walletDisplay');
            }
        }
    }

    setupEventListeners() {
        this.setupCreateWalletButton();
        this.setupCopyAddressButton();
        this.setupShowSeedButton();
        this.setupCopySeedButton();
        this.setupResetWalletButton();
    }

    setupCreateWalletButton() {
        const createWalletBtn = this.dom.get('createWalletBtn');
        if (createWalletBtn) {
            createWalletBtn.addEventListener('click', async () => {
                if (!this.wallet) {
                    alert('Wallet functionality not available');
                    return;
                }

                try {
                    const seedPhrase = this.wallet.generateSeedPhrase();
                    const address = this.wallet.generateTestnet4Address(seedPhrase, 0);

                    this.wallet.storeWallet(seedPhrase, address);
                    const walletData = { seedPhrase, address };

                    this.appState.completeWalletCreation(walletData);
                } catch (error) {
                    console.error('Error creating wallet:', error);
                    alert('Error creating wallet. Please try again.');
                }
            });
        }
    }

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
                        console.error('Error copying address:', error);
                    }
                }
            });
        }
    }

    setupShowSeedButton() {
        const showSeedBtn = this.dom.get('showSeedBtn');
        if (showSeedBtn) {
            showSeedBtn.addEventListener('click', () => {
                const currentWallet = this.appState.wallet;
                if (currentWallet) {
                    this.dom.setText('seedPhraseText', currentWallet.seedPhrase);
                    this.dom.show('seedPhraseDisplay');
                    showSeedBtn.style.display = 'none';
                    const copySeedBtn = this.dom.get('copySeedBtn');
                    if (copySeedBtn) copySeedBtn.style.display = 'inline-block';
                }
            });
        }
    }

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
                        console.error('Error copying seed phrase:', error);
                    }
                }
            });
        }
    }

    setupResetWalletButton() {
        const resetWalletBtn = this.dom.get('resetWalletBtn');
        if (resetWalletBtn) {
            resetWalletBtn.addEventListener('click', () => {
                if (confirm('⚠️ This will permanently delete your wallet and mining data from localStorage. Are you sure?')) {
                    // Clear all localStorage data including mining progress and results
                    localStorage.clear();

                    // Reset app state
                    this.appState.reset();
                    this.stepController.resetAllSteps();

                    console.log('✅ All data cleared - page reset to initial state');
                    alert('✅ All data cleared! You can now test the full flow from the beginning.');
                }
            });
        }
    }

    showWalletInfo(walletData) {
        this.dom.setText('walletAddress', walletData.address);
        this.dom.hide('walletCreation');
        this.dom.show('walletDisplay');
    }
}
