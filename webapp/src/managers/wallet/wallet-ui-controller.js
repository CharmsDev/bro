/**
 * WalletUIController - Manages wallet UI state and visual elements
 */
export class WalletUIController {
    constructor(dom, stepController) {
        this.dom = dom;
        this.stepController = stepController;
    }

    /**
     * Display wallet information and show relevant UI sections
     */
    showWalletInfo(walletData) {
        this.dom.setText('walletAddress', walletData.address);
        this.dom.hide('walletControls');
        this.dom.show('seedPhraseBox');
        this.dom.show('addressMonitoringBox');
    }

    /**
     * Reset UI to initial wallet creation state
     */
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
        this.resetSeedPhraseDisplay();

        // Clear displayed data
        this.clearDisplayedData();

        // Show address note again
        this.showAddressNote();

        // Reset all steps
        if (this.stepController) {
            this.stepController.resetAllSteps();
        }
    }

    /**
     * Reset seed phrase display elements
     */
    resetSeedPhraseDisplay() {
        this.dom.hide('seedPhraseDisplay');
        const showSeedBtn = this.dom.get('showSeedBtn');
        const copySeedBtn = this.dom.get('copySeedBtn');
        if (showSeedBtn) showSeedBtn.style.display = 'inline-block';
        if (copySeedBtn) copySeedBtn.style.display = 'none';
    }

    /**
     * Clear all displayed wallet data
     */
    clearDisplayedData() {
        this.dom.setText('walletAddress', 'Loading...');
        this.dom.setText('seedPhraseText', 'Loading...');
        this.dom.setText('foundUtxoTxid', '-');
        this.dom.setText('foundUtxoVout', '-');
        this.dom.setText('foundUtxoAmount', '-');
        this.dom.setText('fundingStatus', 'Waiting for funds...');
    }

    /**
     * Show the address note for funding instructions
     */
    showAddressNote() {
        const addressNote = document.querySelector('.address-note');
        if (addressNote) addressNote.style.display = 'block';
    }

    /**
     * Hide the address note (typically after UTXO is found)
     */
    hideAddressNote() {
        const addressNote = document.querySelector('.address-note');
        if (addressNote) addressNote.style.display = 'none';
    }

    /**
     * Show UTXO found information
     */
    showUtxoFound(utxo) {
        // Hide the "send funds" message
        this.hideAddressNote();

        // Update UTXO display
        this.dom.setText('foundUtxoTxid', utxo.txid);
        this.dom.setText('foundUtxoVout', utxo.vout.toString());
        this.dom.setText('foundUtxoAmount', `${utxo.amount.toLocaleString()} sats`);
        this.dom.show('utxoFoundDisplay');

        // Hide monitoring display
        this.dom.hide('fundingMonitoring');

        console.log('✅ UTXO found in Step 1:', utxo);
        console.log('🚀 Step 2 (Mining) should now be enabled');
    }

    /**
     * Show funding monitoring UI with spinner
     */
    showFundingMonitoring() {
        this.dom.show('fundingMonitoring');
        this.dom.setText('fundingStatus', 'Starting monitoring...');

        const fundingSpinner = this.dom.get('fundingSpinner');
        const fundingAnimation = this.dom.get('fundingAnimation');

        if (fundingSpinner) fundingSpinner.style.display = 'inline-block';
        if (fundingAnimation) fundingAnimation.style.display = 'flex';
    }

    /**
     * Hide funding monitoring UI
     */
    hideFundingMonitoring() {
        const fundingSpinner = this.dom.get('fundingSpinner');
        const fundingAnimation = this.dom.get('fundingAnimation');
        
        if (fundingSpinner) fundingSpinner.style.display = 'none';
        if (fundingAnimation) fundingAnimation.style.display = 'none';
    }

    /**
     * Update funding status message
     */
    updateFundingStatus(message) {
        this.dom.setText('fundingStatus', message);
    }

    /**
     * Show funding error with appropriate message
     */
    showFundingError(error) {
        this.hideFundingMonitoring();

        const helpMessage = error.message.includes('No UTXOs')
            ? `No unspent funds found at this address.\n\nThis address has transaction history but all UTXOs have been spent.\nPlease send NEW funds to this address to continue.`
            : `Funding monitoring failed: ${error.message}\n\nPlease ensure you have sent funds to the address and try again.`;

        this.updateFundingStatus(`❌ ${error.message}`);
        console.error('❌ Funding monitoring error:', helpMessage);
    }
}
