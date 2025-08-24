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
        console.log(' [BROADCAST] Starting restoreBroadcastState...');

        if (!this.appState) {
            console.log(' [BROADCAST] No appState available');
            return;
        }

        console.log(' [BROADCAST] AppState broadcastResult:', this.appState.broadcastResult);

        // Check localStorage directly for debugging
        const broadcastData = localStorage.getItem('bro_broadcast_data');
        console.log(' [BROADCAST] localStorage bro_broadcast_data:', broadcastData);

        // If we have a broadcast result, show it
        if (this.appState.broadcastResult) {
            console.log(' [BROADCAST] Found broadcast result, restoring UI...');
            this.broadcastResult = this.appState.broadcastResult;

            console.log(' [BROADCAST] Broadcast result data:', JSON.stringify(this.broadcastResult, null, 2));

            this.updateBroadcastStatus('success', 'Transaction broadcast successful!');
            this.displayBroadcastResult(this.appState.broadcastResult);

            // Disable broadcast button since it's already done
            if (this.broadcastBtn) {
                this.broadcastBtn.disabled = true;
                this.broadcastBtn.classList.add('disabled');
                this.broadcastBtn.innerHTML = '<span> Already Broadcast</span>';
                console.log(' [BROADCAST] Broadcast button disabled');
            }

            // Show the broadcast display
            if (this.broadcastDisplay) {
                this.broadcastDisplay.style.display = 'block';
                console.log(' [BROADCAST] Broadcast display shown');
            }
        } else {
            console.log(' [BROADCAST] No broadcast result found in appState');
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
        console.log(' [BROADCAST] displayBroadcastResult called with:', JSON.stringify(result, null, 2));

        const txidElement = document.getElementById('broadcastTxid');
        const explorerLinkElement = document.getElementById('explorerLink');

        console.log(' [BROADCAST] DOM elements found:');
        console.log('  - txidElement:', !!txidElement);
        console.log('  - explorerLinkElement:', !!explorerLinkElement);

        // Step 4 should show the mining transaction txid, not commit/spell txids
        let txidToDisplay = null;

        if (result.txid) {
            // Standard Step 4 mining transaction broadcast result
            txidToDisplay = result.txid;
            console.log(' [BROADCAST] Using standard mining txid:', txidToDisplay);
        } else if (this.appState && this.appState.transaction && this.appState.transaction.txid) {
            // Fallback: get mining transaction txid from Step 3 data
            txidToDisplay = this.appState.transaction.txid;
            console.log(' [BROADCAST] Using mining transaction txid from Step 3 data:', txidToDisplay);
        } else {
            console.error(' [BROADCAST] No mining transaction txid available');
            console.log(' [BROADCAST] Available data:');
            console.log('  - result:', result);
            console.log('  - appState.transaction:', this.appState?.transaction);
            return;
        }

        if (txidElement) {
            console.log(' [BROADCAST] Setting txid:', txidToDisplay);
            txidElement.textContent = txidToDisplay;
            console.log(' [BROADCAST] txidElement updated with:', txidElement.textContent);
        } else {
            console.error(' [BROADCAST] txidElement not found in DOM');
        }

        if (explorerLinkElement) {
            const explorerUrl = getExplorerUrl(txidToDisplay);
            console.log(' [BROADCAST] Setting explorer URL:', explorerUrl);
            explorerLinkElement.href = explorerUrl;
            explorerLinkElement.style.display = 'inline-block';
            console.log(' [BROADCAST] explorerLinkElement updated');
        } else {
            console.error(' [BROADCAST] explorerLinkElement not found in DOM');
        }

        // Double-check final state
        console.log(' [BROADCAST] Final verification:');
        if (txidElement) {
            console.log('  - Final txid text:', txidElement.textContent);
        }
        if (explorerLinkElement) {
            console.log('  - Final explorer href:', explorerLinkElement.href);
            console.log('  - Final explorer display:', explorerLinkElement.style.display);
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
