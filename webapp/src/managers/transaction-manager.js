import { MiningValidator } from '../utils/mining-validator.js';

export class TransactionManager {
    constructor(domElements, stepController, appState, txBuilder, walletVisitManager = null) {
        this.dom = domElements;
        this.stepController = stepController;
        this.appState = appState;
        this.txBuilder = txBuilder;
        this.walletVisitManager = walletVisitManager;
        this.transactionSigner = new ScureBitcoinTransactionSigner();
    }

    initialize() {
        this.setupEventListeners();
        this.restoreTransactionState();
    }

    setupEventListeners() {
        this.setupCreateTransactionButton();
    }

    restoreTransactionState() {
        // Check if we have a saved transaction
        if (this.appState && this.appState.transaction) {
            // Show the transaction display with saved data
            this.showTransactionData(this.appState.transaction);

            // Disable the create transaction button
            this.disableCreateTransactionButton();

            // Enable broadcasting if we're on step 4 or later
            if (this.appState.currentStep >= this.appState.STEPS.BROADCAST) {
                // Get broadcast component and enable it
                const broadcastComponent = window.appController?.getModule('broadcastComponent');
                if (broadcastComponent) {
                    broadcastComponent.enableBroadcasting(this.appState.transaction);
                }
            }
        }
    }

    showTransactionData(transactionData) {
        // Display transaction information
        this.dom.setText('txId', transactionData.txid);
        this.dom.setText('txSize', `${transactionData.size} bytes`);

        // Handle backward compatibility for opReturnData format
        let opReturnDisplay;
        if (typeof transactionData.opReturnData === 'object' && transactionData.opReturnData !== null) {
            // Old format: {hash: "...", nonce: "..."} - show only nonce
            opReturnDisplay = transactionData.opReturnData.nonce || 'Invalid format';
        } else {
            // New format: just the nonce string
            opReturnDisplay = transactionData.opReturnData;
        }

        this.dom.setText('opReturnData', opReturnDisplay);
        this.dom.setText('rawTransaction', transactionData.txHex);

        this.dom.show('transactionDisplay');

        // Mark transaction section as completed
        const transactionSection = document.querySelector('.transaction-section');
        if (transactionSection) {
            transactionSection.classList.add('completed');
        }
    }

    disableCreateTransactionButton() {
        const createTransaction = this.dom.get('createTransaction');
        if (createTransaction) {
            createTransaction.disabled = true;
            createTransaction.classList.add('disabled');
            // Don't change the text here - let the step controller handle button text
        }
    }


    setupCreateTransactionButton() {
        const createTransaction = this.dom.get('createTransaction');
        if (createTransaction) {
            createTransaction.addEventListener('click', async () => {
                if (!this.appState.canCreateTransaction()) {
                    console.error('❌ Missing required data for transaction creation');
                    return;
                }

                try {
                    createTransaction.disabled = true;
                    createTransaction.innerHTML = '<span>Creating Transaction...</span>';

                    // Generate change address from same seed phrase
                    const wallet = new CharmsWallet();
                    const changeAddress = await wallet.generateChangeAddress(this.appState.wallet.seedPhrase);

                    // Get mining result - use best hash and best nonce from progress
                    let miningData = null;
                    if (window.BitcoinMiner) {
                        const miner = new window.BitcoinMiner();
                        const miningProgress = miner.loadMiningProgress();
                        // Use best hash and best nonce for transaction creation
                        if (miningProgress && miningProgress.bestHash && miningProgress.bestNonce > 0) {
                            miningData = {
                                nonce: miningProgress.bestNonce,
                                hash: miningProgress.bestHash,
                                bestHash: miningProgress.bestHash,
                                bestNonce: miningProgress.bestNonce,
                                bestLeadingZeros: miningProgress.bestLeadingZeros
                            };
                        }
                    }


                    // 🔍 VALIDATE MINING RESULT BEFORE CREATING TRANSACTION
                    console.log('[TransactionManager] Validating mining result before transaction creation...');
                    
                    const challengeUtxo = `${this.appState.utxo.txid}:${this.appState.utxo.vout}`;
                    const validationResult = MiningValidator.validateNonce(
                        challengeUtxo,
                        miningData.bestNonce,
                        miningData.bestLeadingZeros
                    );
                    const isValid = validationResult.valid;

                    if (!isValid) {
                        console.error('[MiningValidator] ❌ VALIDATION FAILED - Cannot create transaction!');
                        
                        createTransaction.disabled = false;
                        createTransaction.innerHTML = '<span>Create Transaction</span>';
                        return;
                    }

                    console.log('[MiningValidator] ✅ Mining result is VALID - proceeding with transaction creation');

                    const unsignedTx = await this.txBuilder.createValidatedTransaction(
                        this.appState.utxo,
                        miningData,
                        changeAddress,
                        this.appState.wallet.seedPhrase
                    );

                    // Delegate signing to Transaction Signer Service
                    const utxoWithScript = {
                        ...this.appState.utxo,
                        address: this.appState.wallet.address
                    };

                    const signResult = await this.transactionSigner.signMiningTransaction(
                        unsignedTx,
                        utxoWithScript
                    );

                    const txid = signResult.txid;
                    const rawTx = signResult.signedTxHex;
                    const size = signResult.size;

                    // OP_RETURN only contains the nonce (as stored in the actual transaction)
                    const nonceString = miningData.nonce.toString();

                    this.dom.setText('txId', txid);
                    this.dom.setText('txSize', `${size} bytes`);
                    this.dom.setText('opReturnData', nonceString);
                    this.dom.setText('rawTransaction', rawTx);

                    this.dom.show('transactionDisplay');

                    createTransaction.innerHTML = '<span>✓ Transaction Created</span>';

                    // Mark transaction section as completed
                    const transactionSection = document.querySelector('.transaction-section');
                    if (transactionSection) {
                        transactionSection.classList.add('completed');
                    }

                    // Complete transaction creation step
                    const miningReward = this.appState.miningReward;

                    const transactionData = {
                        txid: txid,
                        txHex: rawTx,
                        size: size,
                        opReturnData: nonceString,
                        outputs: unsignedTx.outputs,
                        inputTxid: this.appState.utxo.txid,
                        inputVout: this.appState.utxo.vout,
                        difficulty: miningData.bestLeadingZeros,
                        reward: miningReward
                    };

                    this.appState.completeTransactionCreation(transactionData);

                    createTransaction.disabled = true;
                    createTransaction.classList.add('disabled');
                    createTransaction.innerHTML = '<span>✅ Transaction Created</span>';
                    
                    const miningManager = window.appController?.getModule('miningManager');
                    if (miningManager && miningManager.updateButtonText) {
                        miningManager.updateButtonText();
                    }

                    if (this.stepController && this.stepController.updateAllSteps) {
                        const state = this.appState.getState();
                        this.stepController.updateAllSteps(state.currentStep, state.completedSteps);
                    }

                } catch (error) {
                    console.error('Error creating transaction:', error);
                    console.error('Error details:', {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    });
                    console.error(`❌ Error creating transaction: ${error.message}`);
                    createTransaction.disabled = false;
                    createTransaction.innerHTML = '<span>Create Transaction</span>';
                }
            });
        }
    }


    reset() {
        // Hide transaction display
        this.dom.hide('transactionDisplay');
        

        // Reset create transaction button
        const createTransaction = this.dom.get('createTransaction');
        if (createTransaction) {
            createTransaction.disabled = false;
            createTransaction.classList.remove('disabled');
            createTransaction.innerHTML = '<span>Create Transaction</span>';
        }
    }
}
