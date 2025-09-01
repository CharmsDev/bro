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

        // Check localStorage directly for debugging
        const broadcastData = localStorage.getItem('bro_broadcast_data');

        // If we have a broadcast result, show it
        if (this.appState.broadcastResult) {
            this.broadcastResult = this.appState.broadcastResult;

            this.updateBroadcastStatus('success', 'Transaction broadcast successful!');
            this.displayBroadcastResult(this.appState.broadcastResult);

            // Disable broadcast button since it's already done
            if (this.broadcastBtn) {
                this.broadcastBtn.disabled = true;
                this.broadcastBtn.classList.add('disabled');
                this.broadcastBtn.innerHTML = '<span> Already Broadcast</span>';
            }

            // Show the broadcast display
            if (this.broadcastDisplay) {
                this.broadcastDisplay.style.display = 'block';
            }
        }
    }

    /**
     * Enable broadcasting for a transaction
     * @param {Object} transaction - The transaction object to broadcast
     */
    enableBroadcasting(transaction) {
        if (!transaction || !transaction.txHex) {
            console.error(' Invalid transaction provided for broadcasting');
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
            this.broadcastBtn.innerHTML = '<span> Broadcast to Network</span>';
        }
    }

    /**
     * Disable broadcasting
     */
    disableBroadcasting() {
        this.currentTransaction = null;
        this.broadcastResult = null;

        if (this.broadcastBtn) {
            this.broadcastBtn.disabled = true;
            this.broadcastBtn.classList.add('disabled');
            this.broadcastBtn.innerHTML = '<span>Broadcast to Network</span>';
        }

        // Hide broadcast display
        if (this.broadcastDisplay) {
            this.broadcastDisplay.style.display = 'none';
        }
    }

    /**
     * Handle the broadcast button click
     */
    async handleBroadcast() {
        if (!this.currentTransaction) {
            console.error(' No transaction available for broadcasting');
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
            this.updateBroadcastStatus('success', ' Transaction broadcast successful! Transaction is now in the mempool.');
            this.displayBroadcastResult(result);

            // Permanently disable the broadcast button since it's successful
            this.broadcastBtn.disabled = true;
            this.broadcastBtn.classList.add('disabled');
            this.broadcastBtn.innerHTML = '<span> Successfully Broadcast</span>';

            // Complete broadcast step
            if (this.appState) {
                this.appState.completeBroadcast(result);
            }

        } catch (error) {
            console.error(' Broadcast failed:', error);

            // Show error information
            const errorMessage = error.message.length > 100
                ? error.message.substring(0, 100) + '...'
                : error.message;

            // Update UI with error
            this.updateBroadcastStatus('error', ' Broadcast failed: ' + errorMessage);

            // Show additional error details in the broadcast display
            this.displayErrorDetails(error);

            // Re-enable the broadcast button for retry
            this.broadcastBtn.disabled = false;
            this.broadcastBtn.classList.remove('disabled');
            this.broadcastBtn.style.pointerEvents = 'auto';
            this.broadcastBtn.style.opacity = '1';
            this.broadcastBtn.style.cursor = 'pointer';
            this.broadcastBtn.innerHTML = '<span> Retry Broadcast</span>';
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
     * Display broadcast result in the UI
     * @param {Object} result - The broadcast result object
     */
    displayBroadcastResult(result) {
        const txidElement = document.getElementById('broadcastTxid');
        const explorerLinkElement = document.getElementById('explorerLink');

        // Step 4 should show the mining transaction txid, not commit/spell txids
        let txidToDisplay = null;

        if (result.txid) {
            // Standard Step 4 mining transaction broadcast result
            txidToDisplay = result.txid;
        } else if (this.appState && this.appState.transaction && this.appState.transaction.txid) {
            // Fallback: get mining transaction txid from Step 3 data
            txidToDisplay = this.appState.transaction.txid;
        } else {
            console.error(' No mining transaction txid available');
            return;
        }

        if (txidElement) {
            txidElement.textContent = txidToDisplay;
        } else {
            console.error(' txidElement not found in DOM');
        }

        if (explorerLinkElement) {
            const explorerUrl = getExplorerUrl(txidToDisplay);
            explorerLinkElement.href = explorerUrl;
            explorerLinkElement.style.display = 'inline-block';
        } else {
            console.error(' explorerLinkElement not found in DOM');
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
            txidElement.textContent = ' Error occurred';
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
