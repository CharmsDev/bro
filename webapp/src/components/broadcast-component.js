// Bitcoin Transaction Broadcasting Component
import { broadcastService } from '../services/broadcast-service.js';

class BroadcastComponent {
    constructor() {
        this.broadcastBtn = null;
        this.broadcastDisplay = null;
        this.currentTransaction = null;
        this.broadcastResult = null;
        this.appState = null;
    }

    /**
     * Initialize the broadcast component
     * @param {Object} appState - The application state object
     */
    initialize(appState = null) {
        this.broadcastBtn = document.getElementById('broadcastTransaction');
        this.broadcastDisplay = document.getElementById('broadcastDisplay');

        // Use provided appState or fallback to window reference
        this.appState = appState || window.appController?.getAppState();

        if (this.broadcastBtn) {
            this.broadcastBtn.addEventListener('click', () => this.handleBroadcast());
        }

        console.log('🔄 BroadcastComponent initializing with appState:', !!this.appState);

        // Restore broadcast state if needed
        this.restoreBroadcastState();

        console.log('✅ Broadcast component initialized');
    }

    /**
     * Restore broadcast state from localStorage
     */
    restoreBroadcastState() {
        if (!this.appState) {
            console.log('❌ No appState available for broadcast restoration');
            return;
        }

        console.log('🔄 Checking broadcast state:', {
            hasBroadcastResult: !!this.appState.broadcastResult,
            hasTransaction: !!this.appState.transaction,
            currentStep: this.appState.currentStep,
            broadcastStep: this.appState.STEPS.BROADCAST
        });

        // If we have a broadcast result, show it
        if (this.appState.broadcastResult) {
            console.log('🔄 Restoring broadcast result from localStorage');
            this.broadcastResult = this.appState.broadcastResult;
            this.updateBroadcastStatus('success', 'Transaction broadcast successful!');
            this.displayBroadcastResult(this.appState.broadcastResult);

            // Disable broadcast button since it's already done
            if (this.broadcastBtn) {
                this.broadcastBtn.disabled = true;
                this.broadcastBtn.classList.add('disabled');
                this.broadcastBtn.innerHTML = '<span>✅ Already Broadcast</span>';
            }
        }
        // If we have a transaction but no broadcast result, enable broadcasting
        else if (this.appState.transaction && this.appState.currentStep >= this.appState.STEPS.BROADCAST) {
            console.log('🔄 Enabling broadcast for existing transaction:', this.appState.transaction.txid);
            this.enableBroadcasting(this.appState.transaction);
        }
        // If we're on step 4 but no transaction yet, wait for it
        else if (this.appState.currentStep === this.appState.STEPS.BROADCAST) {
            console.log('🔄 On broadcast step but no transaction yet, keeping button disabled');
        }
        else {
            console.log('🔄 Not ready for broadcast yet');
        }
    }

    /**
     * Enable broadcasting for a transaction
     * @param {Object} transaction - The transaction object to broadcast
     */
    enableBroadcasting(transaction) {
        if (!transaction || !transaction.txHex) {
            console.error('❌ Invalid transaction provided for broadcasting');
            return;
        }

        this.currentTransaction = transaction;

        if (this.broadcastBtn) {
            // Force enable the button
            this.broadcastBtn.disabled = false;
            this.broadcastBtn.classList.remove('disabled');
            this.broadcastBtn.style.pointerEvents = 'auto';
            this.broadcastBtn.style.opacity = '1';
            this.broadcastBtn.style.cursor = 'pointer';
            this.broadcastBtn.innerHTML = '<span>📡 Broadcast to Network</span>';

            console.log('✅ Broadcast button force-enabled:', {
                disabled: this.broadcastBtn.disabled,
                hasDisabledClass: this.broadcastBtn.classList.contains('disabled'),
                pointerEvents: this.broadcastBtn.style.pointerEvents,
                opacity: this.broadcastBtn.style.opacity
            });
        } else {
            console.error('❌ Broadcast button not found!');
        }

        console.log('✅ Broadcasting enabled for transaction:', transaction.txid);
    }

    /**
     * Disable broadcasting
     */
    disableBroadcasting() {
        this.currentTransaction = null;

        if (this.broadcastBtn) {
            this.broadcastBtn.disabled = true;
            this.broadcastBtn.classList.add('disabled');
        }
    }

    /**
     * Handle the broadcast button click
     */
    async handleBroadcast() {
        if (!this.currentTransaction) {
            console.error('❌ No transaction available for broadcasting');
            return;
        }

        try {
            // Update UI to show broadcasting in progress
            this.updateBroadcastStatus('broadcasting', 'Broadcasting transaction...');
            this.broadcastBtn.disabled = true;
            this.broadcastBtn.innerHTML = '<span>Broadcasting...</span>';

            // 🧪 TEMPORARY TESTING MODIFICATION 🧪
            // TODO: REMOVE THIS BEFORE PRODUCTION!
            // Corrupt the transaction hex for testing (remove last character)
            // This will cause an API error without broadcasting a real transaction
            const corruptedTxHex = this.currentTransaction.txHex.slice(0, -1);
            console.log('🧪 TESTING MODE: Using corrupted transaction hex');
            console.log('Original length:', this.currentTransaction.txHex.length);
            console.log('Corrupted length:', corruptedTxHex.length);
            console.log('⚠️  This will intentionally fail to test error handling');
            // 🧪 END TEMPORARY MODIFICATION 🧪

            // Broadcast the corrupted transaction (will fail safely)
            const result = await broadcastService.broadcastTransaction(corruptedTxHex);

            this.broadcastResult = result;

            // Update UI with success
            this.updateBroadcastStatus('success', 'Transaction broadcast successful!');
            this.displayBroadcastResult(result);

            // Complete broadcast step
            if (this.appState) {
                this.appState.completeBroadcast(result);
            }

            console.log('✅ Transaction broadcast completed:', result);

        } catch (error) {
            console.error('❌ Broadcast failed:', error);

            // Show detailed error information for testing
            const errorMessage = error.message.length > 100
                ? error.message.substring(0, 100) + '...'
                : error.message;

            // Update UI with error
            this.updateBroadcastStatus('error', `🚨 Test Error: ${errorMessage}`);

            // Show additional error details in the broadcast display
            this.displayErrorDetails(error);

            // Re-enable the broadcast button
            this.broadcastBtn.disabled = false;
            this.broadcastBtn.innerHTML = '<span>🔄 Retry Broadcast</span>';
        }
    }

    /**
     * Update the broadcast status display
     * @param {string} status - The status (broadcasting, success, error)
     * @param {string} message - The status message
     */
    updateBroadcastStatus(status, message) {
        const statusElement = document.getElementById('broadcastStatus');
        const spinnerElement = document.getElementById('broadcastSpinner');

        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-value ${status}`;
        }

        if (spinnerElement) {
            spinnerElement.style.display = status === 'broadcasting' ? 'block' : 'none';
        }

        // Show the broadcast display
        if (this.broadcastDisplay) {
            this.broadcastDisplay.style.display = 'block';
        }
    }

    /**
     * Display the broadcast result
     * @param {Object} result - The broadcast result
     */
    displayBroadcastResult(result) {
        const txidElement = document.getElementById('broadcastTxid');
        const explorerLinkElement = document.getElementById('explorerLink');

        if (txidElement) {
            txidElement.textContent = result.txid;
        }

        if (explorerLinkElement) {
            const explorerUrl = broadcastService.getExplorerUrl(result.txid);
            explorerLinkElement.href = explorerUrl;
            explorerLinkElement.style.display = 'inline-block';
        }
    }

    /**
     * Display detailed error information for testing
     * @param {Error} error - The error object
     */
    displayErrorDetails(error) {
        const txidElement = document.getElementById('broadcastTxid');
        const explorerLinkElement = document.getElementById('explorerLink');

        if (txidElement) {
            txidElement.textContent = '🚨 Error occurred';
            txidElement.style.color = '#ef4444';
        }

        if (explorerLinkElement) {
            explorerLinkElement.style.display = 'none';
        }

        // Log detailed error for debugging
        console.log('🔍 Detailed Error Information:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
    }

    /**
     * Enable the next step after successful broadcast
     * @deprecated This is now handled by the step controller
     */
    enableNextStep() {
        // This functionality is now handled by the centralized step system

    }

    /**
     * Get the current broadcast result
     * @returns {Object|null} The broadcast result
     */
    getBroadcastResult() {
        return this.broadcastResult;
    }

    /**
     * Check if broadcasting is available
     * @returns {boolean} True if broadcasting is available
     */
    isBroadcastingAvailable() {
        return this.currentTransaction !== null;
    }
}

// Export singleton instance
export const broadcastComponent = new BroadcastComponent();
export default broadcastComponent;
