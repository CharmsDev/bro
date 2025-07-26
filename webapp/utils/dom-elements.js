// DOM Elements Manager
export class DOMElements {
    constructor() {
        this.elements = this.initializeElements();
    }

    initializeElements() {
        return {
            // Step 1: Wallet
            createWalletBtn: document.getElementById('createWalletBtn'),
            loadDemoWalletBtn: document.getElementById('loadDemoWalletBtn'),
            walletCreation: document.getElementById('walletCreation'),
            walletDisplay: document.getElementById('walletDisplay'),
            walletAddress: document.getElementById('walletAddress'),
            copyAddressBtn: document.getElementById('copyAddressBtn'),
            showSeedBtn: document.getElementById('showSeedBtn'),
            copySeedBtn: document.getElementById('copySeedBtn'),
            seedPhraseDisplay: document.getElementById('seedPhraseDisplay'),
            seedPhraseText: document.getElementById('seedPhraseText'),
            resetWalletBtn: document.getElementById('resetWalletBtn'),

            // Step 2: Mining
            startMining: document.getElementById('startMining'),
            stopMining: document.getElementById('stopMining'),
            miningDisplay: document.getElementById('miningDisplay'),
            nonce: document.getElementById('nonce'),
            currentHash: document.getElementById('currentHash'),
            status: document.getElementById('status'),
            successMessage: document.getElementById('successMessage'),
            finalNonce: document.getElementById('finalNonce'),
            finalHash: document.getElementById('finalHash'),
            progressFill: document.getElementById('progressFill'),

            // Step 3: Transaction
            monitorAddress: document.getElementById('monitorAddress'),
            createTransaction: document.getElementById('createTransaction'),
            generateTestTx: document.getElementById('generateTestTx'),
            monitoringDisplay: document.getElementById('monitoringDisplay'),
            monitoredAddress: document.getElementById('monitoredAddress'),
            monitoringStatus: document.getElementById('monitoringStatus'),
            utxoCount: document.getElementById('utxoCount'),
            utxoDisplay: document.getElementById('utxoDisplay'),
            utxoTxid: document.getElementById('utxoTxid'),
            utxoVout: document.getElementById('utxoVout'),
            utxoAmount: document.getElementById('utxoAmount'),
            transactionDisplay: document.getElementById('transactionDisplay'),
            txId: document.getElementById('txId'),
            txSize: document.getElementById('txSize'),
            opReturnData: document.getElementById('opReturnData'),
            rawTransaction: document.getElementById('rawTransaction'),
            monitoringSpinner: document.getElementById('monitoringSpinner'),
            waitingIndicator: document.getElementById('waitingIndicator'),

            // Step 4: Claim Tokens
            claimTokensBtn: document.getElementById('claimTokensBtn')
        };
    }

    get(elementName) {
        return this.elements[elementName];
    }

    // Helper methods for common operations
    show(elementName) {
        const element = this.get(elementName);
        if (element) element.style.display = 'block';
    }

    hide(elementName) {
        const element = this.get(elementName);
        if (element) element.style.display = 'none';
    }

    setText(elementName, text) {
        const element = this.get(elementName);
        if (element) element.textContent = text;
    }

    setHTML(elementName, html) {
        const element = this.get(elementName);
        if (element) element.innerHTML = html;
    }

    enable(elementName) {
        const element = this.get(elementName);
        if (element) element.disabled = false;
    }

    disable(elementName) {
        const element = this.get(elementName);
        if (element) element.disabled = true;
    }
}
