// Transaction Manager - handles monitoring, UTXO detection, and transaction creation
export class TransactionManager {
    constructor(domElements, stepController, appState, txBuilder) {
        this.dom = domElements;
        this.stepController = stepController;
        this.appState = appState;
        this.txBuilder = txBuilder;
    }

    initialize() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.setupCreateTransactionButton();
    }

    startAutomaticMonitoring() {
        if (!this.appState.canStartMonitoring()) {
            console.error('Cannot start monitoring: missing wallet or mining result');
            return;
        }

        const currentWallet = this.appState.wallet;

        // Show monitoring display automatically
        this.dom.show('monitoringDisplay');
        this.dom.setText('monitoredAddress', currentWallet.address);
        this.dom.setText('monitoringStatus', 'Starting automatic monitoring...');
        this.dom.setText('utxoCount', '0');

        // Show loading indicators
        const monitoringSpinner = this.dom.get('monitoringSpinner');
        const waitingIndicator = this.dom.get('waitingIndicator');
        if (monitoringSpinner) monitoringSpinner.style.display = 'inline-block';
        if (waitingIndicator) waitingIndicator.style.display = 'flex';

        console.log('🚀 Starting automatic monitoring after mining completion');

        // Start monitoring
        const stopFunction = this.txBuilder.monitorAddress(
            currentWallet.address,
            // onUtxoFound callback
            (utxo) => {
                this.appState.completeMonitoring(utxo);
            },
            // onStatusUpdate callback
            (status) => {
                this.dom.setText('monitoringStatus', status.message);
                console.log('Monitoring status:', status);
            },
            // onError callback
            (error) => {
                console.error('Monitoring error:', error);

                // Hide loading indicators
                if (monitoringSpinner) monitoringSpinner.style.display = 'none';
                if (waitingIndicator) waitingIndicator.style.display = 'none';

                this.dom.setText('monitoringStatus', `❌ ${error.message}`);
                alert(`Monitoring failed: ${error.message}\n\nPlease ensure you have sent funds to the address and try again.`);
            }
        );

        // Store stop function in app state
        this.appState.startMonitoring(stopFunction);
    }

    showUtxoFound(utxo) {
        // Hide loading indicators
        const monitoringSpinner = this.dom.get('monitoringSpinner');
        const waitingIndicator = this.dom.get('waitingIndicator');
        if (monitoringSpinner) monitoringSpinner.style.display = 'none';
        if (waitingIndicator) waitingIndicator.style.display = 'none';

        // Update UI with found UTXO
        this.dom.setText('monitoringStatus', '✅ UTXO Found!');
        this.dom.setText('utxoCount', '1');

        // Show UTXO details
        this.dom.setText('utxoTxid', utxo.txid);
        this.dom.setText('utxoVout', utxo.vout.toString());
        this.dom.setText('utxoAmount', `${utxo.amount.toLocaleString()} sats`);
        this.dom.show('utxoDisplay');

        console.log('Real UTXO found:', utxo);
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
                    // Disable button during creation
                    createTransaction.disabled = true;
                    createTransaction.innerHTML = '<span>Creating Transaction...</span>';

                    // Create transaction with real data
                    const tx = await this.txBuilder.createValidatedTransaction(
                        this.appState.utxo,
                        this.appState.miningResult,
                        this.appState.wallet.address
                    );

                    // Calculate transaction details
                    const txid = await tx.calculateTxId();
                    const rawTx = tx.serialize();
                    const size = tx.getSize();

                    // Create minimal OP_RETURN data display - only hash and nonce
                    const hashPrefix = this.appState.miningResult.hash.substring(0, 32); // 16 bytes (32 hex chars)
                    const nonceHex = this.appState.miningResult.nonce.toString(16).padStart(8, '0'); // 4 bytes (8 hex chars)

                    const opReturnDataObj = {
                        hash: hashPrefix,
                        nonce: nonceHex
                    };

                    // Update UI with transaction details
                    this.dom.setText('txId', txid);
                    this.dom.setText('txSize', `${size} bytes`);
                    this.dom.setText('opReturnData', JSON.stringify(opReturnDataObj, null, 2));
                    this.dom.setText('rawTransaction', rawTx);

                    // Show transaction display
                    this.dom.show('transactionDisplay');

                    // Update button
                    createTransaction.innerHTML = '<span>✓ Transaction Created</span>';

                    // Enable Step 4: Claim Tokens
                    this.stepController.enableClaimTokensStep();

                    console.log('Real transaction created successfully:', {
                        txid: txid,
                        size: size,
                        opReturnData: opReturnDataObj,
                        rawTx: rawTx
                    });

                } catch (error) {
                    console.error('Error creating transaction:', error);
                    alert('Error creating transaction. Please try again.');
                    createTransaction.disabled = false;
                    createTransaction.innerHTML = '<span>Create Transaction</span>';
                }
            });
        }
    }
}
