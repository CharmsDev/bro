export class WalletManager {
    constructor(domElements, stepController, appState, wallet, txBuilder = null, miningManager = null, transactionManager = null) {
        this.dom = domElements;
        this.stepController = stepController;
        this.appState = appState;
        this.wallet = wallet;
        this.txBuilder = txBuilder;
        this.miningManager = miningManager;
        this.transactionManager = transactionManager;
    }

    initialize() {
        this.checkExistingWallet();
        this.setupEventListeners();
    }

    checkExistingWallet() {
        if (!this.wallet) return;

        try {
            const existingWallet = this.wallet.getStoredWallet();
            if (existingWallet) {
                const address = existingWallet.address;

                // Validate address format
                const isValidFormat = address &&
                    typeof address === 'string' &&
                    (
                        (address.startsWith('tb1q') && address.length === 42) ||
                        (address.startsWith('tb1p') && address.length === 62)
                    );

                if (isValidFormat) {
                    this.appState.completeWalletCreation(existingWallet);
                    console.log('Loaded existing wallet:', existingWallet);

                    // Show wallet info and start monitoring if no UTXO yet
                    this.showWalletInfo(existingWallet);

                    this.appState.loadMiningResult();
                } else {
                    console.log('Found invalid wallet address format, clearing:', address, typeof address);
                    this.wallet.clearWallet();
                    this.dom.show('walletControls');
                    this.dom.hide('seedPhraseBox');
                    this.dom.hide('addressMonitoringBox');
                }
            }
        } catch (error) {
            console.error('Error checking existing wallet, clearing localStorage:', error);
            localStorage.clear();
            this.dom.show('walletControls');
            this.dom.hide('seedPhraseBox');
            this.dom.hide('addressMonitoringBox');
        }
    }

    setupEventListeners() {
        this.setupCreateWalletButton();
        this.setupLoadDemoWalletButton();
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
                    console.error('❌ Wallet functionality not available');
                    return;
                }

                try {
                    const seedPhrase = this.wallet.generateSeedPhrase();
                    const address = await this.wallet.generateTestnet4Address(seedPhrase, 0);

                    this.wallet.storeWallet(seedPhrase, address);
                    const walletData = { seedPhrase, address };

                    this.appState.completeWalletCreation(walletData);
                } catch (error) {
                    console.error('Error creating wallet:', error);
                    console.error('❌ Error creating wallet. Please try again.');
                }
            });
        }
    }

    setupLoadDemoWalletButton() {
        const loadDemoWalletBtn = this.dom.get('loadDemoWalletBtn');
        console.log('Setting up demo wallet button:', !!loadDemoWalletBtn);

        if (loadDemoWalletBtn) {
            loadDemoWalletBtn.addEventListener('click', async () => {
                console.log('Demo wallet button clicked');
                console.log('Wallet instance available:', !!this.wallet);
                console.log('AppState available:', !!this.appState);

                if (!this.wallet) {
                    console.error('❌ Wallet functionality not available');
                    return;
                }

                try {
                    // First reset the entire app state to clear any previous data
                    if (this.appState) {
                        this.appState.reset();
                    }

                    // Reset transaction manager if available
                    if (this.transactionManager) {
                        this.transactionManager.reset();
                    }

                    this.wallet.clearWallet();

                    // BIP39 compliant demo seed phrase
                    const demoSeedPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
                    console.log('Generating address for demo seed phrase...');

                    const address = await this.wallet.generateTestnet4Address(demoSeedPhrase, 0);
                    console.log('Generated demo address:', address);

                    this.wallet.storeWallet(demoSeedPhrase, address);
                    const walletData = { seedPhrase: demoSeedPhrase, address };

                    if (this.appState) {
                        this.appState.completeWalletCreation(walletData);
                    } else {
                        console.error('AppState not available');
                    }

                    console.log('✅ Demo wallet loaded successfully');
                    console.log('Address:', address);
                } catch (error) {
                    console.error('Error loading demo wallet:', error);
                    console.error('❌ Error loading demo wallet. Please try again.');
                }
            });
        } else {
            console.error('Demo wallet button not found in DOM');
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
                if (confirm('⚠️ This will permanently delete your current wallet and all data. Are you sure?')) {
                    localStorage.clear();

                    this.appState.reset();
                    this.stepController.resetAllSteps();

                    // Reset mining manager if available
                    if (this.miningManager) {
                        this.miningManager.reset();
                    }

                    // Reset transaction manager if available
                    if (this.transactionManager) {
                        this.transactionManager.reset();
                    }

                    // Reset UI to initial state
                    this.resetToInitialState();

                    console.log('✅ All data cleared - page reset to initial state');
                }
            });
        }
    }

    resetToInitialState() {
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
        if (showSeedBtn) showSeedBtn.style.display = 'inline-block';
        if (copySeedBtn) copySeedBtn.style.display = 'none';

        // Clear any displayed data
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

    showWalletInfo(walletData) {
        this.dom.setText('walletAddress', walletData.address);
        this.dom.hide('walletControls');
        this.dom.show('seedPhraseBox');
        this.dom.show('addressMonitoringBox');

        // Start UTXO monitoring after showing wallet
        setTimeout(() => {
            this.startFundingMonitoring();
        }, 100);
    }

    startFundingMonitoring() {
        if (!this.appState.wallet || !this.txBuilder) {
            console.error('Cannot start funding monitoring: missing wallet or txBuilder');
            return;
        }

        // Check if we already have a UTXO
        if (this.appState.utxo) {
            this.showUtxoFound(this.appState.utxo);
            return;
        }

        const currentWallet = this.appState.wallet;

        // Show monitoring UI
        this.dom.show('fundingMonitoring');
        this.dom.setText('fundingStatus', 'Starting monitoring...');

        const fundingSpinner = this.dom.get('fundingSpinner');
        const fundingAnimation = this.dom.get('fundingAnimation');

        if (fundingSpinner) fundingSpinner.style.display = 'inline-block';
        if (fundingAnimation) fundingAnimation.style.display = 'flex';

        const stopFunction = this.txBuilder.monitorAddress(
            currentWallet.address,
            (utxo) => {
                this.showUtxoFound(utxo);
                this.appState.completeFunding(utxo);
            },
            (status) => {
                this.dom.setText('fundingStatus', status.message);
            },
            (error) => {
                console.error('Funding monitoring error:', error);

                if (fundingSpinner) fundingSpinner.style.display = 'none';
                if (fundingAnimation) fundingAnimation.style.display = 'none';

                this.dom.setText('fundingStatus', `❌ ${error.message}`);

                const helpMessage = error.message.includes('No UTXOs')
                    ? `No unspent funds found at this address.\n\nThis address has transaction history but all UTXOs have been spent.\nPlease send NEW funds to this address to continue.`
                    : `Funding monitoring failed: ${error.message}\n\nPlease ensure you have sent funds to the address and try again.`;

                console.error('❌ Funding monitoring error:', helpMessage);
            }
        );

        this.appState.startMonitoring(stopFunction);
    }

    showUtxoFound(utxo) {
        const fundingSpinner = this.dom.get('fundingSpinner');
        const fundingAnimation = this.dom.get('fundingAnimation');
        if (fundingSpinner) fundingSpinner.style.display = 'none';
        if (fundingAnimation) fundingAnimation.style.display = 'none';

        // Hide the "send funds" message
        const addressNote = document.querySelector('.address-note');
        if (addressNote) addressNote.style.display = 'none';

        // Keep the title as "Your Testnet4 Address" - don't change it

        this.dom.setText('foundUtxoTxid', utxo.txid);
        this.dom.setText('foundUtxoVout', utxo.vout.toString());
        this.dom.setText('foundUtxoAmount', `${utxo.amount.toLocaleString()} sats`);
        this.dom.show('utxoFoundDisplay');

        // Hide monitoring display
        this.dom.hide('fundingMonitoring');

        console.log('✅ UTXO found in Step 1:', utxo);
        console.log('🚀 Step 2 (Mining) should now be enabled');
    }
}
