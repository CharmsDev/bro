export class DOMElements {
    constructor() {
        this.elements = this.initializeElements();
    }

    initializeElements() {
        return {
            // Wallet elements
            createWalletBtn: document.getElementById('createWalletBtn'),
            loadDemoWalletBtn: document.getElementById('loadDemoWalletBtn'),
            walletControls: document.querySelector('.wallet-controls'),
            seedPhraseBox: document.getElementById('seedPhraseBox'),
            walletAddress: document.getElementById('walletAddress'),
            copyAddressBtn: document.getElementById('copyAddressBtn'),
            showSeedBtn: document.getElementById('showSeedBtn'),
            copySeedBtn: document.getElementById('copySeedBtn'),
            seedPhraseDisplay: document.getElementById('seedPhraseDisplay'),
            seedPhraseText: document.getElementById('seedPhraseText'),
            resetWalletBtn: document.getElementById('resetWalletBtn'),
            addressMonitoringBox: document.getElementById('addressMonitoringBox'),

            // Funding monitoring elements
            fundingMonitoring: document.getElementById('fundingMonitoring'),
            fundingStatus: document.getElementById('fundingStatus'),
            fundingSpinner: document.getElementById('fundingSpinner'),
            fundingAnimation: document.getElementById('fundingAnimation'),
            utxoFoundDisplay: document.getElementById('utxoFoundDisplay'),
            foundUtxoTxid: document.getElementById('foundUtxoTxid'),
            foundUtxoVout: document.getElementById('foundUtxoVout'),
            foundUtxoAmount: document.getElementById('foundUtxoAmount'),

            // Mining elements
            startMining: document.getElementById('startMining'),
            stopMining: document.getElementById('stopMining'),
            miningDisplay: document.getElementById('miningDisplay'),
            nonce: document.getElementById('nonce'),
            currentHash: document.getElementById('currentHash'),
            currentLeadingZeros: document.getElementById('currentLeadingZeros'),
            bestHash: document.getElementById('bestHash'),
            bestNonce: document.getElementById('bestNonce'),
            bestLeadingZeros: document.getElementById('bestLeadingZeros'),
            status: document.getElementById('status'),
            successMessage: document.getElementById('successMessage'),
            finalNonce: document.getElementById('finalNonce'),
            finalHash: document.getElementById('finalHash'),
            finalLeadingZeros: document.getElementById('finalLeadingZeros'),
            progressFill: document.getElementById('progressFill'),

            // Reward elements
            leadingZerosCount: document.getElementById('leadingZerosCount'),
            tokenReward: document.getElementById('tokenReward'),
            proofOfWork: document.getElementById('proofOfWork'),
            rewardFormula: document.getElementById('rewardFormula'),

            // Transaction elements
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

            // Token claim elements
            claimTokensBtn: document.getElementById('claimTokensBtn'),

            // Wallet visit elements
            visitWalletBtn: document.getElementById('visitWalletBtn')
        };
    }

    get(elementName) {
        return this.elements[elementName];
    }

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
