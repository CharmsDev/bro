// Bitcoin Transaction Broadcasting Component
import { broadcastTransaction, getExplorerUrl } from '../services/bitcoin/broadcastTx.js';

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

        // Restore broadcast state if needed
        this.restoreBroadcastState();
    }

    /**
     * Restore broadcast state from localStorage
     */
    restoreBroadcastState() {
        if (!this.appState) {
            return;
        }

        // If we have a broadcast result, show it
        if (this.appState.broadcastResult) {
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
            this.enableBroadcasting(this.appState.transaction);
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
        }
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

            // Broadcast the transaction to the Bitcoin network
            const result = await broadcastTransaction(this.currentTransaction.txHex);

            this.broadcastResult = result;

            // Update UI with success
            this.updateBroadcastStatus('success', '✅ Transaction broadcast successful! Transaction is now in the mempool.');
            this.displayBroadcastResult(result);

            // Permanently disable the broadcast button since it's successful
            this.broadcastBtn.disabled = true;
            this.broadcastBtn.classList.add('disabled');
            this.broadcastBtn.innerHTML = '<span>✅ Successfully Broadcast</span>';

            // Complete broadcast step
            if (this.appState) {
                this.appState.completeBroadcast(result);
            }


        } catch (error) {
            console.error('❌ Broadcast failed:', error);

            // Show error information
            const errorMessage = error.message.length > 100
                ? error.message.substring(0, 100) + '...'
                : error.message;

            // Update UI with error
            this.updateBroadcastStatus('error', `❌ Broadcast failed: ${errorMessage}`);

            // Show additional error details in the broadcast display
            this.displayErrorDetails(error);

            // Re-enable the broadcast button for retry
            this.broadcastBtn.disabled = false;
            this.broadcastBtn.classList.remove('disabled');
            this.broadcastBtn.style.pointerEvents = 'auto';
            this.broadcastBtn.style.opacity = '1';
            this.broadcastBtn.style.cursor = 'pointer';
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
            const explorerUrl = getExplorerUrl(result.txid);
            explorerLinkElement.href = explorerUrl;
            explorerLinkElement.style.display = 'inline-block';
        }
    }

    /**
     * Display detailed error information
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
