import { DOMElements } from '../../managers/dom-elements.js';
// StepController removed - functionality moved to StepCoordinator and DomainCoordinator
// SimpleStepManager removed - using atomic steps instead
import { WalletManager } from '../../managers/wallet/wallet-manager.js';
import { MiningManager } from '../../managers/mining-manager.js';
import { TransactionManager } from '../../managers/transaction-manager.js';
import { BroadcastManager } from '../../managers/broadcast-manager.js';
import { WalletVisitManager } from '../../managers/wallet-visit-manager.js';
import { MintingManager } from '../../managers/minting-manager.js';

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

        // StepController removed - using StepCoordinator and DomainCoordinator instead

        this.modules.miningManager = new MiningManager(
            this.modules.domElements,
            null, // stepController removed
            this.appState,
            this.miner
        );

        this.modules.walletManager = new WalletManager(
            this.modules.domElements,
            null, // stepController removed
            this.appState,
            this.wallet,
            this.txBuilder,
            this.modules.miningManager,
            this.modules.transactionManager
        );

        // Create wallet visit manager with funding monitor and mining manager
        this.modules.walletVisitManager = new WalletVisitManager(
            this.modules.domElements,
            null, // stepController removed
            this.appState,
            this.modules.walletManager.fundingMonitor,
            this.modules.miningManager
        );

        this.modules.transactionManager = new TransactionManager(
            this.modules.domElements,
            null, // stepController removed
            this.appState,
            this.txBuilder,
            this.modules.walletVisitManager
        );

        this.modules.broadcastManager = new BroadcastManager(
            this.modules.domElements,
            null, // stepController removed
            this.appState
        );

        this.modules.mintingManager = new MintingManager(
            this.appState,
            this.modules.domElements
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

        // Step system initialization now handled by StepCoordinator and DomainCoordinator
        // No separate initialization needed

        // After steps are initialized, ensure mining success UI is restored on reload
        try {
            const miningResult = this.appState?.miningResult;
            const hasTransaction = !!this.appState?.transaction;
            if (miningResult && !hasTransaction) {
                // Repopulate the "Nice hash, bro" box with saved result
                this.modules.miningManager.restoreCompletedMining(miningResult);
            }
        } catch (_) { /* noop */ }

        // BroadcastManager is already initialized in initializeGlobalModules

        // Setup Step 5 event listener
        this.setupStep5EventListener();
        
        // Setup UTXO display event listener for step controller updates
        this.setupUtxoDisplayEventListener();

        // Restore Step 5 summary and enable Step 6 on reload if we already broadcasted
        try {
            const broadcastData = this.appState?.broadcastDomain?.broadcastResult;
            console.log('[AppController] Checking broadcast data for Step 5/6 restoration:', broadcastData);
            
            if (broadcastData && broadcastData.spellTxid) {
                console.log('[AppController] ✅ Broadcast data found - restoring Step 5 UI and enabling Step 6');
                
                // Create Step 5 UI container if missing
                this.modules.mintingManager.uiManager.initializeUI();
                
                // Show Step 5 success summary with broadcast results
                this.modules.mintingManager.uiManager.showSuccess(broadcastData);
                
                // Enable Step 6 visit wallet button and mark section active
                this.modules.walletVisitManager.enableWalletVisitStep();
                
                // Disable minting button since we're done
                this.disableMintingButton();
            } else {
                console.log('[AppController] ❌ No broadcast data found - Step 5/6 restoration skipped');
            }
        } catch (error) {
            console.warn('[AppController] Error during Step 5/6 restoration:', error);
        }

        this.logInitializationStatus();
        
        // ✅ DEBUG: Verificar estado actual del localStorage y Step
        console.log('[AppController] ✅ Initialization completed successfully');
    }

    initializeGlobalModules() {
        if (window.AppState) {
            // AppState auto-hydrates from storage in its constructor
            this.appState = new window.AppState();
        }

        if (window.CharmsWallet) {
            this.wallet = new window.CharmsWallet();
        }

        console.log('[AppController] 🔍 DEBUG - window.BitcoinTxBuilder:', window.BitcoinTxBuilder);
        console.log('[AppController] 🔍 DEBUG - typeof window.BitcoinTxBuilder:', typeof window.BitcoinTxBuilder);
        
        if (window.BitcoinTxBuilder) {
            this.txBuilder = new window.BitcoinTxBuilder();
            console.log('[AppController] ✅ BitcoinTxBuilder initialized:', this.txBuilder);
        } else {
            console.log('[AppController] ❌ window.BitcoinTxBuilder not available');
        }

        console.log('[AppController] 🔍 DEBUG - window.BitcoinMiner:', window.BitcoinMiner);
        console.log('[AppController] 🔍 DEBUG - typeof window.BitcoinMiner:', typeof window.BitcoinMiner);
        
        if (window.BitcoinMiner) {
            this.miner = new window.BitcoinMiner();
            console.log('[AppController] ✅ BitcoinMiner initialized:', this.miner);
        } else {
            console.log('[AppController] ❌ window.BitcoinMiner not available');
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
            // Step states now managed by StepCoordinator automatically
        });

        this.appState.on('transactionCreated', (transaction) => {
            // Update mining button to show "Mining Disabled"
            this.modules.miningManager.updateButtonText();
            // BroadcastManager handles this automatically via event listener
        });

        this.appState.on('transactionBroadcast', (result) => {

        });

        // Listen for step changes to enable/disable minting button
        this.appState.on('stepChanged', (data) => {
            console.log('[AppController] 🎯 stepChanged event received:', data);
            
            if (data.currentStep === 5) {
                console.log('[AppController] Step 5 active - enabling minting button');
                this.enableMintingButton();
            } else if (data.currentStep === 6) {
                console.log('[AppController] Step 6 active - disabling minting button and enabling wallet visit');
                this.disableMintingButton();
                this.modules.walletVisitManager.enableWalletVisitStep();
            }
        });

        // Step management now handled by StepCoordinator and DomainCoordinator
        // No manual step controller updates needed
    }

    enableMintingButton() {
        const claimTokensBtn = document.getElementById('claimTokensBtn');
        if (claimTokensBtn) {
            claimTokensBtn.disabled = false;
            claimTokensBtn.classList.remove('disabled');
            console.log('[AppController] Minting button enabled');
        }
    }

    disableMintingButton() {
        const claimTokensBtn = document.getElementById('claimTokensBtn');
        if (claimTokensBtn) {
            claimTokensBtn.disabled = true;
            claimTokensBtn.classList.add('disabled');
            console.log('[AppController] Minting button disabled');
        }
    }

    setupStep5EventListener() {
        const claimTokensBtn = document.getElementById('claimTokensBtn');
        const buttonSpan = claimTokensBtn?.querySelector('span');
        const originalButtonText = buttonSpan?.textContent || 'Start BRO Token Minting';

        if (claimTokensBtn) {
            claimTokensBtn.addEventListener('click', async () => {
                console.log('🎯 [AppController] Step 5 button clicked - starting minting process');
                console.log('🎯 [AppController] Button disabled state:', claimTokensBtn.disabled);
                console.log('🎯 [AppController] MintingManager exists:', !!this.modules.mintingManager);
                console.log('🎯 [AppController] MintingManager executeMintingProcess exists:', !!this.modules.mintingManager?.executeMintingProcess);
                
                if (claimTokensBtn.disabled) {
                    console.log('❌ [AppController] Button is disabled, returning');
                    return;
                }

                try {
                    // Disable button and update text immediately
                    console.log('🔧 [AppController] Disabling button and updating text');
                    claimTokensBtn.disabled = true;
                    claimTokensBtn.classList.add('disabled');
                    if (buttonSpan) {
                        buttonSpan.textContent = 'Minting now...';
                    }

                    console.log('🚀 [AppController] Calling mintingManager.executeMintingProcess()...');
                    await this.modules.mintingManager.executeMintingProcess();
                    console.log('✅ [AppController] MintingManager.executeMintingProcess() completed successfully');
                } catch (error) {
                    console.error('❌ [AppController] Step 5 minting process failed:', error);
                    console.error('❌ [AppController] Error stack:', error.stack);
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
            // Step updates now handled automatically by StepCoordinator
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
        
        // Create Step 5 UI container if missing
        this.modules.mintingManager.uiManager.initializeUI();
        
        // LocalStorage Keys
        console.log('\n📦 LocalStorage Keys:');
        const keys = Object.keys(localStorage).filter(key => key.startsWith('bro_'));
        keys.forEach(key => {
            const value = localStorage.getItem(key);
            try {
                const parsed = JSON.parse(value);
                console.log(`  ${key}:`, parsed);
            } catch {
                console.log(`  ${key}: ${value}`);
            }
        });
        
        // Step 5 Specific Data
        console.log('\n🔐 Step 5 (Signed Transactions):');
        const signedData = localStorage.getItem('bro_signed_transactions');
        if (signedData) {
            try {
                const parsed = JSON.parse(signedData);
                console.log(`  ✅ Found signed transactions: ${parsed.transactions?.length || 0} transactions`);
                console.log(`  ✅ Status: ${parsed.status}`);
                console.log(`  ✅ Timestamp: ${parsed.timestamp}`);
            } catch (e) {
                console.log(`  ❌ Error parsing signed transactions:`, e);
            }
        } else {
            console.log('  ❌ No signed transactions found');
        }
        
        // Step 6 Specific Data
        console.log('\n📡 Step 6 (Broadcast Data):');
        const broadcastData = localStorage.getItem('bro_broadcast_data');
        if (broadcastData) {
            try {
                const parsed = JSON.parse(broadcastData);
                console.log(`  ✅ Found broadcast data`);
                console.log(`  ✅ Commit TXID: ${parsed.commitTxid}`);
                console.log(`  ✅ Spell TXID: ${parsed.spellTxid}`);
                console.log(`  ✅ Status: ${parsed.status}`);
                console.log(`  ✅ Timestamp: ${parsed.timestamp}`);
                
                // Check if we should be in Step 6
                if (parsed.status === 'broadcast' && parsed.spellTxid) {
                    console.log(`  🎯 BROADCAST COMPLETED - Should be in Step 6!`);
                    console.log(`  📍 Current Step Check: ${currentStep} (should be 6)`);
                }
            } catch (e) {
                console.log(`  ❌ Error parsing broadcast data:`, e);
            }
        } else {
            console.log('  ❌ No broadcast data found');
        }
        
        // Domain States
        console.log('\n🏗️ Domain States:');
        console.log(`  Mining: ${this.appState.miningDomain.hasMiningResult()}`);
        console.log(`  Transaction: ${this.appState.transactionDomain.hasTransaction()}`);
        console.log(`  Broadcast: ${this.appState.broadcastDomain.hasBroadcastResult()}`);
        
        console.log('🔍 ===== END DEBUG =====\n');
    }
}
