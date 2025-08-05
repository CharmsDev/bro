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
        this.dom.setText('opReturnData', JSON.stringify(transactionData.opReturnData, null, 2));
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
                    alert('Missing required data for transaction creation');
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

                    const unsignedTx = await this.txBuilder.createValidatedTransaction(
                        this.appState.utxo,
                        this.appState.miningResult,
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

                    // Minimal OP_RETURN data display
                    const hashPrefix = this.appState.miningResult.hash.substring(0, 32);
                    const nonceHex = this.appState.miningResult.nonce.toString(16).padStart(8, '0');

                    const opReturnDataObj = {
                        hash: hashPrefix,
                        nonce: nonceHex
                    };

                    this.dom.setText('txId', txid);
                    this.dom.setText('txSize', `${size} bytes`);
                    this.dom.setText('opReturnData', JSON.stringify(opReturnDataObj, null, 2));
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
                        opReturnData: opReturnDataObj
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
                    alert(`Error creating transaction: ${error.message}\n\nCheck console for details.`);
                    createTransaction.disabled = false;
                    createTransaction.innerHTML = '<span>Create Transaction</span>';
                }
            });
        }
    }
}
