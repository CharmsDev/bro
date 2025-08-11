export class TransactionManager {
    constructor(domElements, stepController, appState, txBuilder, walletVisitManager = null) {
        this.dom = domElements;
        this.stepController = stepController;
        this.appState = appState;
        this.txBuilder = txBuilder;
        this.walletVisitManager = walletVisitManager;
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
            console.log('🔄 Restoring transaction state from localStorage');

            // Show the transaction display with saved data
            this.showTransactionData(this.appState.transaction);

            // Disable the create transaction button
            this.disableCreateTransactionButton();

            // Enable broadcasting if we're on step 4 or later
            if (this.appState.currentStep >= this.appState.STEPS.BROADCAST) {
                console.log('🔄 Enabling broadcast for restored transaction');
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

        console.log('✅ Transaction data restored to UI');
    }

    disableCreateTransactionButton() {
        const createTransaction = this.dom.get('createTransaction');
        if (createTransaction) {
            createTransaction.disabled = true;
            createTransaction.classList.add('disabled');
            createTransaction.innerHTML = '<span>✅ Transaction Created</span>';
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

                    console.log('Using change address:', changeAddress);

                    console.log('Creating unsigned PSBT...');

                    // Get mining result - either completed result or best from progress
                    let miningData = this.appState.miningResult;
                    if (!miningData && window.BitcoinMiner) {
                        const miner = new window.BitcoinMiner();
                        const miningProgress = miner.loadMiningProgress();
                        if (miningProgress && miningProgress.bestHash && miningProgress.bestNonce) {
                            miningData = {
                                nonce: miningProgress.bestNonce,
                                hash: miningProgress.bestHash,
                                bestHash: miningProgress.bestHash,
                                bestNonce: miningProgress.bestNonce,
                                bestLeadingZeros: miningProgress.bestLeadingZeros
                            };
                        }
                    }

                    const unsignedTx = await this.txBuilder.createValidatedTransaction(
                        this.appState.utxo,
                        miningData,
                        changeAddress,
                        this.appState.wallet.seedPhrase
                    );

                    const psbtHex = unsignedTx.serialize();
                    console.log('✅ PSBT created successfully');
                    console.log('PSBT hex length:', psbtHex.length);

                    console.log('Initializing @scure/btc-signer...');
                    const signer = new ScureBitcoinTransactionSigner();

                    console.log('Signing PSBT...');
                    console.log('PSBT hex to sign:', psbtHex.substring(0, 100) + '...');
                    console.log('UTXO for signing:', this.appState.utxo);

                    const utxoWithScript = {
                        ...this.appState.utxo,
                        address: this.appState.wallet.address
                    };

                    const signResult = await signer.signPSBT(
                        psbtHex,
                        utxoWithScript,
                        this.appState.wallet.seedPhrase,
                        "m/86'/0'/0'"
                    );

                    const txid = signResult.txid;
                    const rawTx = signResult.signedTxHex;
                    const size = signResult.signedTx.virtualSize();

                    console.log('✅ Transaction signed and finalized successfully!');
                    console.log('Final transaction hex:', rawTx);
                    console.log('Transaction size:', size, 'bytes');

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
                    const transactionData = {
                        txid: txid,
                        txHex: rawTx,
                        size: size,
                        opReturnData: nonceString,
                        outputs: unsignedTx.outputs,
                        inputTxid: this.appState.utxo.txid,
                        inputVout: this.appState.utxo.vout,
                        difficulty: miningData.bestLeadingZeros,
                        reward: this.appState.miningReward
                    };

                    this.appState.completeTransactionCreation(transactionData);
                    console.log('Real transaction created successfully:', transactionData);

                    // Disable create transaction button permanently and update text
                    createTransaction.disabled = true;
                    createTransaction.classList.add('disabled');
                    createTransaction.innerHTML = '<span>✅ Transaction Created</span>';

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

        console.log('🔄 Transaction manager reset completed');
    }
}
