// CLEAN Transaction Manager - Properly separated responsibilities
// Creates Bitcoin transactions and coordinates services
// Handles transaction creation process
import { MiningValidator } from '../mining/mining-validator.js';
import { ScureBitcoinTransactionSigner } from '../services/transaction-signer-service.js';
import { UIHelper } from './shared/UIHelper.js';

export class TransactionManager {
    constructor(domElements, stepController, appState, txBuilder) {
        this.dom = domElements;
        this.stepController = stepController;
        this.appState = appState;
        this.txBuilder = txBuilder;
        this.transactionSigner = new ScureBitcoinTransactionSigner();
    }

    initialize() {
        this.setupEventListeners();
        this.restoreTransactionState();
    }

    setupEventListeners() {
        this.setupCreateTransactionButton();
        this.setupTransactionDomainListeners();
        this.setupStepChangeListener();
    }

    // Setup Create Transaction button - CLEAN SEPARATION
    setupCreateTransactionButton() {
        const createTransaction = this.dom.get('createTransaction');
        if (createTransaction) {
            createTransaction.addEventListener('click', async () => {
                console.log('[TransactionManager] Create Transaction button clicked');

                try {
                    // Show loading state
                    createTransaction.disabled = true;
                    createTransaction.innerHTML = '<span>Creating Transaction...</span>';

                    // Delegate to main transaction creation function
                    const transactionData = await this.createBitcoinTransaction();

                    // Update UI with transaction data
                    this.displayTransactionData(transactionData);

                    // Update button state - consistent with Step 4 style
                    createTransaction.innerHTML = '<span>Transaction Created</span>';
                    createTransaction.classList.add('disabled');
                    createTransaction.style.pointerEvents = '';
                    createTransaction.style.opacity = '';

                    // DELEGATE state management to AppState
                    this.appState.getTransactionDomain().completeTransactionCreation(transactionData);

                    // Update step controller
                    this.updateStepController();

                } catch (error) {
                    console.error('[TransactionManager] Transaction creation failed:', error);
                    
                    // Reset button on error
                    createTransaction.disabled = false;
                    createTransaction.innerHTML = '<span>Create Transaction</span>';
                    
                    // Show error to user (could emit event for error handling)
                    this.appState.emit('transactionCreationFailed', error);
                }
            });
        }
    }

    /**
     * MAIN FUNCTION: Create Bitcoin Transaction
     * This is the core business logic for creating a Bitcoin transaction
     */
    async createBitcoinTransaction() {
        console.log('[TransactionManager] 🚀 Starting Bitcoin transaction creation process...');

        // 1. VALIDATE REQUIREMENTS
        this.validateTransactionRequirements();

        // 2. GET MINING DATA (with fallback)
        const miningData = this.getMiningData();
        console.log('[TransactionManager] 📊 Mining data obtained:', {
            nonce: miningData.nonce,
            hash: miningData.hash,
            leadingZeros: miningData.leadingZeros
        });

        // 3. VALIDATE MINING RESULT
        this.validateMiningResult(miningData);
        console.log('[TransactionManager] ✅ Mining result validation passed');

        // 4. GENERATE CHANGE ADDRESS
        const changeAddress = await this.generateChangeAddress();
        console.log('[TransactionManager] 🏠 Change address generated:', changeAddress);

        // 5. CREATE UNSIGNED TRANSACTION
        const unsignedTx = await this.createUnsignedTransaction(miningData, changeAddress);
        console.log('[TransactionManager] 📝 Unsigned transaction created');

        // 6. SIGN TRANSACTION
        const signResult = await this.signTransaction(unsignedTx);
        console.log('[TransactionManager] ✍️ Transaction signed successfully');

        // 7. BUILD FINAL TRANSACTION DATA
        const transactionData = this.buildTransactionData(signResult, unsignedTx, miningData);
        console.log('[TransactionManager] 🎯 Transaction creation completed:', transactionData.txid);

        return transactionData;
    }

    /**
     * Validate that we have all requirements for transaction creation
     */
    validateTransactionRequirements() {
        const walletDomain = this.appState.getWalletDomain();
        const miningDomain = this.appState.getMiningDomain();

        if (!walletDomain.hasWallet()) {
            throw new Error('Wallet is required for transaction creation');
        }

        if (!walletDomain.hasUtxo()) {
            console.log('[TransactionManager] DEBUG - UTXO missing:', {
                hasWallet: walletDomain.hasWallet(),
                hasUtxo: walletDomain.hasUtxo(),
                utxo: walletDomain.utxo,
                walletDomainData: walletDomain.data,
                walletDomainKeys: Object.keys(walletDomain)
            });
            throw new Error('UTXO is required for transaction creation');
        }

        if (!miningDomain.hasMiningResult() && !this.hasLocalStorageMiningData()) {
            throw new Error('Mining result is required for transaction creation');
        }

        console.log('[TransactionManager] ✅ All requirements validated');
    }

    /**
     * Get mining data with localStorage fallback
     */
    getMiningData() {
        const miningDomain = this.appState.getMiningDomain();

        // Try AppState first
        if (miningDomain.miningResult) {
            console.log('[TransactionManager] Using mining data from AppState');
            const result = miningDomain.miningResult;
            
            console.log('[TransactionManager] DEBUG - Raw miningResult:', result);
            console.log('[TransactionManager] DEBUG - Available keys:', Object.keys(result));
            
            // Transform format for transaction builder
            const transformed = {
                hash: result.bestHash,
                nonce: parseInt(result.bestNonce, 10), // Convert string to number
                leadingZeros: result.bestLeadingZeros || result.leadingZeros
            };
            
            console.log('[TransactionManager] DEBUG - Transformed result:', transformed);
            return transformed;
        }

        // Fallback to localStorage
        if (window.BitcoinMiner) {
            const miner = new window.BitcoinMiner();
            const miningProgress = miner.loadMiningProgress();
            if (miningProgress && miningProgress.bestHash && miningProgress.bestNonce > 0) {
                console.log('[TransactionManager] Using mining data from localStorage fallback');
                return {
                    nonce: parseInt(miningProgress.bestNonce, 10), // Convert to number
                    hash: miningProgress.bestHash,
                    bestHash: miningProgress.bestHash,
                    bestNonce: parseInt(miningProgress.bestNonce, 10), // Convert to number
                    bestLeadingZeros: miningProgress.bestLeadingZeros
                };
            }
        }

        throw new Error('No mining data found in AppState or localStorage');
    }

    /**
     * Validate mining result before creating transaction
     */
    validateMiningResult(miningData) {
        const walletDomain = this.appState.getWalletDomain();
        const challengeUtxo = `${walletDomain.utxo.txid}:${walletDomain.utxo.vout}`;
        
        const validationResult = MiningValidator.validateNonce(
            challengeUtxo,
            miningData.nonce,
            miningData.leadingZeros
        );

        if (!validationResult.valid) {
            throw new Error('Mining validation failed - nonce is not valid for the challenge UTXO');
        }
    }

    /**
     * Generate change address from wallet seed phrase
     */
    async generateChangeAddress() {
        const walletDomain = this.appState.getWalletDomain();
        const { WalletService } = await import('../services/wallet-service.js');
        const wallet = new WalletService();
        return await wallet.generateChangeAddress(walletDomain.wallet.seedPhrase);
    }

    // Create unsigned Bitcoin transaction
    async createUnsignedTransaction(miningData, changeAddress) {
        const walletDomain = this.appState.getWalletDomain();
        
        // Combine UTXO with wallet address for transaction creation
        const utxoWithAddress = {
            ...walletDomain.utxo,
            address: walletDomain.wallet.address
        };
        
        console.log('[TransactionManager] DEBUG - UTXO with address:', utxoWithAddress);
        
        return await this.txBuilder.createValidatedTransaction(
            utxoWithAddress,
            miningData,
            changeAddress,
            walletDomain.wallet.seedPhrase
        );
    }

    // Sign the Bitcoin transaction
    async signTransaction(unsignedTx) {
        const walletDomain = this.appState.getWalletDomain();
        
        const utxoWithScript = {
            ...walletDomain.utxo,
            address: walletDomain.wallet.address
        };

        return await this.transactionSigner.signMiningTransaction(
            unsignedTx,
            utxoWithScript
        );
    }

    /**
     * Build final transaction data object
     */
    buildTransactionData(signResult, unsignedTx, miningData) {
        const walletDomain = this.appState.getWalletDomain();
        const miningDomain = this.appState.getMiningDomain();

        return {
            txid: signResult.txid,
            txHex: signResult.signedTxHex,
            size: signResult.size,
            opReturnData: miningData.nonce.toString(),
            outputs: unsignedTx.outputs,
            inputTxid: walletDomain.utxo.txid,
            inputVout: walletDomain.utxo.vout,
            difficulty: miningData.bestLeadingZeros,
            reward: miningDomain.getMiningReward()
        };
    }

    /**
     * Display transaction data in UI
     */
    displayTransactionData(transactionData) {
        this.dom.setText('txId', transactionData.txid);
        this.dom.setText('txSize', `${transactionData.size} bytes`);
        this.dom.setText('opReturnData', transactionData.opReturnData);
        this.dom.setText('rawTransaction', transactionData.txHex);
        this.dom.show('transactionDisplay');

        // Mark transaction section as completed
        const transactionSection = document.querySelector('.transaction-section');
        if (transactionSection) {
            transactionSection.classList.add('completed');
        }
    }

    /**
     * Update step controller after transaction creation
     */
    updateStepController() {
        // Update mining manager to disable mining button
        const miningManager = window.appController?.getModule('miningManager');
        if (miningManager && miningManager.updateButtonText) {
            miningManager.updateButtonText();
        }

        // Update step controller
        if (this.stepController && this.stepController.updateAllSteps) {
            const state = this.appState.getState();
            this.stepController.updateAllSteps(state.currentStep, state.completedSteps);
        }
    }

    /**
     * Check if localStorage has mining data
     */
    hasLocalStorageMiningData() {
        if (window.BitcoinMiner) {
            const miner = new window.BitcoinMiner();
            const miningProgress = miner.loadMiningProgress();
            return miningProgress && miningProgress.bestHash && miningProgress.bestNonce > 0;
        }
        return false;
    }

    /**
     * Setup listeners for transaction domain events
     */
    setupTransactionDomainListeners() {
        // Listen for transaction domain events if needed
        this.appState.on('transactionCreated', (transactionData) => {
            console.log('[TransactionManager] Transaction domain notified of creation:', transactionData.txid);
        });
    }

    /**
     * Restore transaction state from storage
     */
    restoreTransactionState() {
        const transactionDomain = this.appState.getTransactionDomain();
        if (transactionDomain.hasTransaction()) {
            this.displayTransactionData(transactionDomain.transaction);
            
            // Update button state
            const createTransaction = this.dom.get('createTransaction');
            if (createTransaction) {
                createTransaction.disabled = true;
                createTransaction.classList.add('disabled');
                createTransaction.innerHTML = '<span>Transaction Created</span>';
                createTransaction.style.pointerEvents = '';
                createTransaction.style.opacity = '';
            }
        }
    }


    /**
     * Setup Step Change listener - Enable/Disable Create Transaction button
     */
    setupStepChangeListener() {
        console.log('[TransactionManager] Setting up stepChanged listener');
        
        // Check current state immediately (in case hydration already happened)
        this.checkCurrentStepState();
        
        // Listen for Step 3 events via eventBus
        this.appState.on('stepChanged', (data) => {
            console.log('[TransactionManager] stepChanged event received:', data);
            
            if (data.step === 3) {
                if (data.enabled) {
                    console.log('[TransactionManager] Step 3 enabled, enabling Create Transaction button');
                    UIHelper.enableTransactionButton();
                } else {
                    console.log('[TransactionManager] Step 3 disabled, disabling Create Transaction button');
                    UIHelper.disableTransactionButton();
                }
            }
        });
    }

    /**
     * Check current step state and enable button if Step 3 is active
     */
    checkCurrentStepState() {
        const currentStep = this.appState.stepCoordinator.currentStep;
        const isStep3Active = currentStep === 3;
        
        console.log('[TransactionManager] Checking current step state:', {
            currentStep,
            isStep3Active,
            hasMiningResult: this.appState.miningDomain.hasMiningResult(),
            hasTransaction: this.appState.transactionDomain.hasTransaction()
        });
        
        if (isStep3Active && this.appState.miningDomain.hasMiningResult() && !this.appState.transactionDomain.hasTransaction()) {
            console.log('[TransactionManager] Step 3 is currently active - enabling Create Transaction button');
            UIHelper.enableTransactionButton();
        }
    }
}
