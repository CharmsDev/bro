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
        this.setupCopySeedButton(); // Ahora maneja todos los botones de copiar seed
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

                    this.appState.walletDomain.completeWalletCreation(walletData);
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
            this.appState.walletDomain.completeWalletCreation(walletData);
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
     * Copy seed phrase button handler - Maneja todos los botones de copiar seed
     */
    setupCopySeedButton() {
        // Lista de IDs de botones que copian la seed phrase
        const buttonIds = ['copySeedBtn', 'copyDirectSeedBtn'];
        
        buttonIds.forEach(buttonId => {
            const button = this.dom.get(buttonId);
            if (button) {
                button.addEventListener('click', async (event) => {
                    event.preventDefault();
                    console.log(`[WalletEventHandlers] Copy seed button clicked: ${buttonId}`);
                    
                    const currentWallet = this.appState.walletDomain.wallet;
                    if (currentWallet && currentWallet.seedPhrase && this.wallet) {
                        try {
                            console.log('[WalletEventHandlers] Copying seed phrase to clipboard...');
                            await this.wallet.copyToClipboard(currentWallet.seedPhrase);
                            
                            // Visual feedback - cambiar texto del botón
                            const originalText = button.textContent;
                            button.textContent = '✅ Copied!';
                            button.style.backgroundColor = '#28a745';
                            button.style.color = 'white';
                            
                            setTimeout(() => {
                                button.textContent = originalText;
                                button.style.backgroundColor = '';
                                button.style.color = '';
                            }, 2000);
                            
                            console.log('[WalletEventHandlers] Seed phrase copied successfully');
                        } catch (error) {
                            console.error('[WalletEventHandlers] Error copying to clipboard:', error);
                            
                            // Visual feedback de error
                            const originalText = button.textContent;
                            button.textContent = '❌ Error';
                            button.style.backgroundColor = '#dc3545';
                            button.style.color = 'white';
                            
                            setTimeout(() => {
                                button.textContent = originalText;
                                button.style.backgroundColor = '';
                                button.style.color = '';
                            }, 2000);
                        }
                    } else {
                        console.warn('[WalletEventHandlers] No wallet or seed phrase available for copying');
                        
                        // Visual feedback - no wallet
                        const originalText = button.textContent;
                        button.textContent = '⚠️ No Wallet';
                        button.style.backgroundColor = '#ffc107';
                        button.style.color = 'black';
                        
                        setTimeout(() => {
                            button.textContent = originalText;
                            button.style.backgroundColor = '';
                            button.style.color = '';
                        }, 2000);
                    }
                });
            }
        });
    }

    /**
     * Reset wallet button handler
     */
    setupResetWalletButton() {
        const resetWalletBtn = this.dom.get('resetWalletBtn');
        if (resetWalletBtn) {
            resetWalletBtn.addEventListener('click', (event) => {
                event.preventDefault(); // Prevenir recarga de página
                event.stopPropagation(); // Prevenir propagación del evento
                
                if (confirm('⚠️ This will permanently delete your current wallet and all data. Are you sure?')) {
                    console.log('🔄 [WalletEventHandlers] Starting full reset...');
                    this.performFullReset();
                }
            });
        }
    }

    /**
     * Perform full application reset - SIN RECARGA DE PÁGINA
     */
    performFullReset() {
        try {
            console.log('🔄 [WalletEventHandlers] Executing complete reset...');
            
            // SOLO llamar al reset del AppState - él se encarga de todo
            this.appState.reset();
            
            console.log('✅ [WalletEventHandlers] Complete reset finished');
            
            // Forzar actualización de UI sin recargar página
            this.forceUIUpdate();
            
        } catch (error) {
            console.error('❌ [WalletEventHandlers] Reset failed:', error);
            throw error;
        }
    }

    /**
     * Forzar actualización de UI después del reset
     */
    forceUIUpdate() {
        console.log('🎨 [WalletEventHandlers] Forcing UI update after reset...');
        
        // Ocultar elementos que deberían estar ocultos después del reset
        this.dom.hide('seedPhraseBox');
        this.dom.hide('addressMonitoringBox');
        this.dom.hide('importWalletForm');
        this.dom.hide('fundingMonitoring');
        this.dom.hide('utxoFoundDisplay');
        this.dom.hide('miningDisplay');
        
        // Mostrar solo los controles de wallet inicial
        this.dom.show('walletControls');
        
        // Resetear textos de botones si es necesario
        const createBtn = this.dom.get('createWalletBtn');
        const importBtn = this.dom.get('importWalletBtn');
        if (createBtn) createBtn.style.display = 'inline-block';
        if (importBtn) importBtn.style.display = 'inline-block';
        
        console.log('✅ [WalletEventHandlers] UI update completed');
    }
}
