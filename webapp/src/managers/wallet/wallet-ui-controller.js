/**
 * WalletUIController - Manages wallet UI state and visual elements
 */
export class WalletUIController {
    constructor(dom, stepController) {
        this.dom = dom;
        this.stepController = stepController;
        this.isImportMode = false;
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
        this.dom.hide('importWalletForm');

        // Hide funding monitoring
        this.dom.hide('fundingMonitoring');
        this.dom.hide('utxoFoundDisplay');

        // Reset seed phrase display
        this.resetSeedPhraseDisplay();

        // Clear displayed data
        this.clearDisplayedData();

        // Reset import form
        this.resetImportForm();

        // Show address note again
        this.showAddressNote();

        // Reset all steps
        if (this.stepController) {
            this.stepController.resetAllSteps();
        }

        this.isImportMode = false;
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
        
        // Clear import form
        const seedInput = this.dom.get('seedPhraseInput');
        if (seedInput) {
            seedInput.value = '';
        }
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

        // Force DOM update to ensure the message is visible
        const statusElement = this.dom.get('fundingStatus');
        if (statusElement) {
            statusElement.textContent = message;
            // Force a repaint
            statusElement.offsetHeight;
        } else {
            console.warn(`[WalletUI] ⚠️ fundingStatus element not found in DOM`);
        }
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

    /**
     * Show import wallet form
     */
    showImportForm() {
        this.dom.hide('walletControls');
        this.dom.show('importWalletForm');
        this.isImportMode = true;
        
        // Focus on the textarea
        const seedInput = this.dom.get('seedPhraseInput');
        if (seedInput) {
            setTimeout(() => seedInput.focus(), 100);
        }
    }

    /**
     * Hide import wallet form and return to wallet controls
     */
    hideImportForm() {
        this.dom.hide('importWalletForm');
        this.dom.show('walletControls');
        this.resetImportForm();
        this.isImportMode = false;
    }

    /**
     * Reset import form to initial state
     */
    resetImportForm() {
        const seedInput = this.dom.get('seedPhraseInput');
        if (seedInput) {
            seedInput.value = '';
            seedInput.classList.remove('error');
        }
        
        // Clear any error messages
        const errorMsg = document.querySelector('.import-error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    }

    /**
     * Validate seed phrase format
     */
    validateSeedPhrase(seedPhrase) {
        if (!seedPhrase || typeof seedPhrase !== 'string') {
            return { valid: false, error: 'Seed phrase is required' };
        }

        const trimmed = seedPhrase.trim();
        if (!trimmed) {
            return { valid: false, error: 'Seed phrase cannot be empty' };
        }

        const words = trimmed.split(/\s+/);
        if (words.length !== 12) {
            return { valid: false, error: `Seed phrase must contain exactly 12 words (found ${words.length})` };
        }

        // Basic word validation - check for common issues
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            if (!word || word.length < 2) {
                return { valid: false, error: `Word ${i + 1} appears to be invalid` };
            }
            if (!/^[a-zA-Z]+$/.test(word)) {
                return { valid: false, error: `Word ${i + 1} contains invalid characters (only letters allowed)` };
            }
        }

        return { valid: true, words: words.map(w => w.toLowerCase()) };
    }

    /**
     * Show import error message
     */
    showImportError(message) {
        // Remove existing error message
        const existingError = document.querySelector('.import-error-message');
        if (existingError) {
            existingError.remove();
        }

        // Create new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'import-error-message';
        errorDiv.style.cssText = 'color: #ff4444; font-size: 14px; margin-top: 10px; padding: 8px; background: rgba(255, 68, 68, 0.1); border-radius: 4px; border: 1px solid rgba(255, 68, 68, 0.3);';
        errorDiv.textContent = `❌ ${message}`;

        // Insert after the textarea container
        const container = document.querySelector('.seed-input-container');
        if (container) {
            container.parentNode.insertBefore(errorDiv, container.nextSibling);
        }

        // Add error styling to textarea
        const seedInput = this.dom.get('seedPhraseInput');
        if (seedInput) {
            seedInput.classList.add('error');
        }
    }

    /**
     * Get seed phrase from import form
     */
    getImportSeedPhrase() {
        const seedInput = this.dom.get('seedPhraseInput');
        return seedInput ? seedInput.value : '';
    }

    /**
     * Show wallet info for imported wallet (slightly different from new wallet)
     */
    showImportedWalletInfo(walletData) {
        this.dom.setText('walletAddress', walletData.address);
        this.dom.hide('walletControls');
        this.dom.hide('importWalletForm');
        this.dom.show('seedPhraseBox');
        this.dom.show('addressMonitoringBox');
        
        // For imported wallets, show the seed phrase immediately in the display
        this.dom.setText('seedPhraseText', walletData.seedPhrase);
        this.dom.show('seedPhraseDisplay');
        
        // Hide show button, show copy button
        const showSeedBtn = this.dom.get('showSeedBtn');
        const copySeedBtn = this.dom.get('copySeedBtn');
        if (showSeedBtn) showSeedBtn.style.display = 'none';
        if (copySeedBtn) copySeedBtn.style.display = 'inline-block';
    }
}
