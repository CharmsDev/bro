// Centralized UI reset operations
// Provides shared reset functionality for complete and partial resets
export class UIResetHelper {
    
    // Hides all step display sections
    static hideAllDisplays() {
        const displays = [
            'walletDisplay',
            'utxoDisplay', 
            'miningDisplay',
            'transactionDisplay',
            'broadcastDisplay',
            'mintingDisplay'
        ];
        
        displays.forEach(displayId => {
            const display = document.getElementById(displayId);
            if (display) {
                display.style.display = 'none';
            }
        });
    }

    // Hides minting-related displays while preserving wallet
    static hideMintingDisplays() {
        const displaysToHide = [
            'utxoDisplay',        // Hide old UTXO display
            'miningDisplay',
            'transactionDisplay',
            'broadcastDisplay',
            'mintingDisplay'
        ];
        
        displaysToHide.forEach(displayId => {
            const display = document.getElementById(displayId);
            if (display) {
                display.style.display = 'none';
                console.log(`[UIResetHelper] ${displayId} hidden`);
            }
        });
    }

    // Clears transaction display content
    static clearTransactionContent() {
        console.log('[UIResetHelper] Clearing Step 3 transaction content');
        
        const txId = document.getElementById('txId');
        const txSize = document.getElementById('txSize');
        const opReturnData = document.getElementById('opReturnData');
        const rawTransaction = document.getElementById('rawTransaction');
        
        if (txId) txId.textContent = '-';
        if (txSize) txSize.textContent = '-';
        if (opReturnData) opReturnData.textContent = '-';
        if (rawTransaction) rawTransaction.textContent = '-';
    }

    // Clears broadcast display content
    static clearBroadcastContent() {
        console.log('[UIResetHelper] Clearing Step 4 broadcast content');
        
        const broadcastStatus = document.getElementById('broadcastStatus');
        const broadcastTxid = document.getElementById('broadcastTxid');
        const explorerLink = document.getElementById('explorerLink');
        const broadcastSpinner = document.getElementById('broadcastSpinner');
        
        if (broadcastStatus) {
            broadcastStatus.textContent = 'Ready to broadcast...';
            broadcastStatus.className = 'status-value';
        }
        if (broadcastTxid) broadcastTxid.textContent = '-';
        if (explorerLink) {
            explorerLink.style.display = 'none';
            explorerLink.href = '#';
        }
        if (broadcastSpinner) {
            broadcastSpinner.style.display = 'none';
        }
    }

    // Clears minting display content
    static clearMintingContent() {
        console.log('[UIResetHelper] Clearing Step 5 minting content');
        
        const mintingDisplay = document.getElementById('mintingDisplay');
        if (mintingDisplay) {
            const statusElements = mintingDisplay.querySelectorAll('.status-value, .minting-value');
            statusElements.forEach(el => {
                if (el.textContent !== undefined) {
                    el.textContent = '-';
                }
            });
        }
    }

    /**
     * Resets all buttons to initial disabled state
     */
    static resetAllButtons() {
        const buttons = [
            { id: 'startMining', text: 'Start Mining', enabled: false },
            { id: 'createTransaction', text: 'Create Transaction', enabled: false },
            { id: 'broadcastTransaction', text: 'Broadcast to Network', enabled: false },
            { id: 'claimTokensBtn', text: 'Start BRO Token Minting', enabled: false },
            { id: 'goToWalletBtn', text: 'Go To My Wallet', enabled: false },
            { id: 'mintMoreBtn', text: 'Mint More', enabled: false }
        ];
        
        buttons.forEach(({ id, text, enabled }) => {
            UIResetHelper.resetButton(id, text, enabled);
        });
    }

    // Resets minting-related buttons only
    static resetMintingButtons() {
        const buttons = [
            { id: 'startMining', text: 'Start Mining', enabled: false },
            { id: 'createTransaction', text: 'Create Transaction', enabled: false },
            { id: 'broadcastTransaction', text: 'Broadcast to Network', enabled: false },
            { id: 'claimTokensBtn', text: 'Start BRO Token Minting', enabled: false }
        ];
        
        buttons.forEach(({ id, text, enabled }) => {
            UIResetHelper.resetButton(id, text, enabled);
        });
    }

    // Configures individual button state
    static resetButton(buttonId, text, enabled) {
        const button = document.getElementById(buttonId);
        if (button) {
            const span = button.querySelector('span');
            if (span) span.textContent = text;
            
            button.disabled = !enabled;
            if (enabled) {
                button.classList.remove('disabled');
                button.style.pointerEvents = 'auto';
                button.style.opacity = '1';
            } else {
                button.classList.add('disabled');
                button.style.pointerEvents = 'none';
                button.style.opacity = '0.5';
            }
        }
    }

    // Updates step controller display
    static updateStepController(currentStep, completedSteps) {
        if (window.appController?.modules?.stepController) {
            window.appController.modules.stepController.updateAllSteps(currentStep, completedSteps);
        }
    }

    // Clears wallet display content
    static clearWalletContent() {
        // Clear seed phrase display
        const seedPhraseElement = document.getElementById('seedPhrase');
        if (seedPhraseElement) {
            seedPhraseElement.textContent = '';
        }
        
        // Clear wallet address display
        const walletAddressElement = document.getElementById('walletAddress');
        if (walletAddressElement) {
            walletAddressElement.textContent = '';
        }
        
        // Clear any other wallet-related content
        const walletDisplay = document.getElementById('walletDisplay');
        if (walletDisplay) {
            const walletContent = walletDisplay.querySelectorAll('.wallet-content, .seed-phrase, .wallet-address');
            walletContent.forEach(element => {
                element.textContent = '';
            });
        }
        
        console.log('[UIResetHelper] Wallet content cleared');
    }

    // Performs complete UI reset for fresh start
    static performCompleteUIReset() {
        console.log('[UIResetHelper] Performing complete UI reset');
        
        UIResetHelper.hideAllDisplays();
        UIResetHelper.clearWalletContent();
        UIResetHelper.clearTransactionContent();
        UIResetHelper.clearBroadcastContent();
        UIResetHelper.clearMintingContent();
        UIResetHelper.resetAllButtons();
        UIResetHelper.updateStepController(1, []);
        
        console.log('[UIResetHelper] Complete UI reset finished');
    }

    /**
     * Performs partial UI reset for new minting cycle
     */
    static performPartialUIReset(preserveWallet = true) {
        console.log('[UIResetHelper] Performing partial UI reset');
        
        UIResetHelper.hideMintingDisplays();
        UIResetHelper.clearTransactionContent();
        UIResetHelper.clearBroadcastContent();
        UIResetHelper.clearMintingContent();
        UIResetHelper.resetMintingButtons();
        UIResetHelper.updateStepController(1, []);
        
        // CRITICAL: Hide old UTXO display for fresh start
        const utxoDisplay = document.getElementById('utxoDisplay');
        if (utxoDisplay) {
            utxoDisplay.style.display = 'none';
            console.log('[UIResetHelper] UTXO display hidden for fresh start');
        }
        
        if (preserveWallet) {
            const walletDisplay = document.getElementById('walletDisplay');
            if (walletDisplay) {
                walletDisplay.style.display = 'block';
            }
        }
        
        console.log('[UIResetHelper] Partial UI reset finished');
    }
}
