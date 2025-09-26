/**
 * BROADCAST MANAGER - Step 4: Transaction Broadcasting
 * 
 * Manages the broadcasting of mining transactions to the Bitcoin network
 * Follows the same pattern as other step managers
 */
import { broadcastTransaction, getExplorerUrl } from '../services/bitcoin/broadcastTx.js';
import { UIHelper } from './shared/UIHelper.js';

export class BroadcastManager {
    constructor(domElements, stepController, appState) {
        this.dom = domElements;
        this.stepController = stepController;
        this.appState = appState;
        
        // UI Elements
        this.broadcastBtn = null;
        this.broadcastDisplay = null;
        
        // State
        this.currentTransaction = null;
        this.broadcastResult = null;
        
        this.initializeElements();
        this.setupEventListeners();
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.broadcastBtn = document.getElementById('broadcastTransaction');
        this.broadcastDisplay = document.getElementById('broadcastDisplay');
        
        if (!this.broadcastBtn) {
            console.error('[BroadcastManager] Broadcast button not found');
        }
        if (!this.broadcastDisplay) {
            console.error('[BroadcastManager] Broadcast display not found');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (this.broadcastBtn) {
            this.broadcastBtn.addEventListener('click', () => this.handleBroadcast());
        }

        // Listen for transaction creation events
        this.appState.on('transactionCreated', (transaction) => {
            this.enableBroadcasting(transaction);
        });

        // Listen for Step 4 events via eventBus
        this.appState.on('stepChanged', (data) => {
            if (data.step === 4 && data.enabled) {
                console.log('[BroadcastManager] Step 4 enabled, enabling broadcast button');
                UIHelper.enableBroadcastButton();
                UIHelper.updateStepController();
            }
            
            // Show broadcast summary in Step 5 when current step is 6
            if (data.currentStep === 6) {
                this.showBroadcastSummaryInStep5();
            }
        });

        this.appState.on('stepCompleted', (data) => {
            if (data.step === 4) {
                console.log('[BroadcastManager] Step 4 completed');
                UIHelper.updateStepController();
            }
        });

        // Listen for UI restoration events from hydration
        this.appState.on('uiRestorationNeeded', (data) => {
            console.log('[BroadcastManager] UI restoration needed, restoring broadcast UI');
            this.restoreUIFromHydratedState(data);
        });

        // Restore state on initialization
        this.restoreBroadcastState();
    }

    /**
     * Restore UI from hydrated state (called after browser refresh)
     */
    restoreUIFromHydratedState(data) {
        const { stepData } = data;
        
        // Restore Step 4 broadcast UI
        if (stepData.step4) {
            if (stepData.step4.hasBroadcast) {
                // Show existing broadcast result
                this.displayBroadcastResult(this.appState.broadcastDomain.broadcastResult);
                this.updateBroadcastStatus('success', 'Transaction broadcast successful!');
                this.disableBroadcastButton('Already Broadcast');
                this.showBroadcastDisplay();
            } else if (stepData.step4.isActive && stepData.step3.hasTransaction) {
                // Enable broadcast button if step is active and has transaction
                this.enableBroadcasting(this.appState.transactionDomain.transaction);
            }
        }
        
        // Show broadcast summary in Step 5 if current step is 6 and we have broadcast data
        if (data.currentStep === 6 && stepData.step4?.hasBroadcast) {
            this.showBroadcastSummaryInStep5();
        }
    }

    /**
     * Restore broadcast state from AppState
     */
    restoreBroadcastState() {
        // If we have a broadcast result, show it
        if (this.appState.broadcastResult) {
            this.broadcastResult = this.appState.broadcastResult;
            this.updateBroadcastStatus('success', 'Transaction broadcast successful!');
            this.displayBroadcastResult(this.appState.broadcastResult);
            this.disableBroadcastButton('Already Broadcast');
            this.showBroadcastDisplay();
        }
        
        // If we have a transaction but no broadcast result, enable broadcasting
        else if (this.appState.transaction) {
            this.enableBroadcasting(this.appState.transaction);
        }
    }

    /**
     * Enable broadcasting for a transaction
     */
    enableBroadcasting(transaction) {
        if (!transaction || !transaction.txHex) {
            console.error('[BroadcastManager] Invalid transaction provided');
            return;
        }

        console.log('[BroadcastManager] Enabling broadcasting for transaction:', transaction.txid);
        
        this.currentTransaction = transaction;
        this.enableBroadcastButton('Broadcast to Network');
    }

    /**
     * Disable broadcasting
     */
    disableBroadcasting() {
        console.log('[BroadcastManager] Disabling broadcasting');
        
        this.currentTransaction = null;
        this.broadcastResult = null;
        this.disableBroadcastButton('Broadcast to Network');
        this.hideBroadcastDisplay();
    }

    /**
     * Handle broadcast button click
     */
    async handleBroadcast() {
        if (!this.currentTransaction) {
            console.error('[BroadcastManager] No transaction available for broadcasting');
            return;
        }

        console.log('[BroadcastManager] Starting broadcast process');

        try {
            // Update UI to show broadcasting in progress
            this.updateBroadcastStatus('broadcasting', 'Broadcasting transaction...');
            this.disableBroadcastButton('Broadcasting...');
            this.showBroadcastDisplay();

            // Broadcast the transaction
            const result = await broadcastTransaction(this.currentTransaction.txHex);
            
            console.log('[BroadcastManager] Broadcast successful:', result);

            // Update UI with success
            this.updateBroadcastStatus('success', 'Transaction broadcast successful! Transaction is now in the mempool.');
            this.displayBroadcastResult(result);
            this.disableBroadcastButton('Successfully Broadcast');

            // Update AppState (this will save to localStorage and emit broadcastCompleted)
            this.appState.broadcastDomain.completeBroadcast(result);
            
            // Note: Step progression is handled automatically by DomainCoordinator
            // via the broadcastCompleted event emitted by BroadcastDomain

        } catch (error) {
            console.error('[BroadcastManager] Broadcast failed:', error);
            this.handleBroadcastError(error);
        }
    }

    /**
     * Handle broadcast error
     */
    handleBroadcastError(error) {
        const errorMessage = error.message.length > 100
            ? error.message.substring(0, 100) + '...'
            : error.message;

        // Update UI with error
        this.updateBroadcastStatus('error', `Broadcast failed: ${errorMessage}`);
        this.displayErrorDetails(error);
        this.enableBroadcastButton('Retry Broadcast');
    }

    /**
     * Update broadcast status display
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
    }

    /**
     * Display broadcast result
     */
    displayBroadcastResult(result) {
        console.log('[BroadcastManager] displayBroadcastResult called with:', result);
        const txidElement = document.getElementById('broadcastTxid');
        const explorerLinkElement = document.getElementById('explorerLink');

        // Get the transaction ID to display
        let txidToDisplay = null;
        if (result.txid) {
            txidToDisplay = result.txid;
        } else if (result.spellTxid) {
            // Use spell transaction as the main transaction ID for display
            txidToDisplay = result.spellTxid;
        } else if (result.commitTxid) {
            // Fallback to commit transaction ID
            txidToDisplay = result.commitTxid;
        } else if (this.appState.transactionDomain?.transaction?.txid) {
            txidToDisplay = this.appState.transactionDomain.transaction.txid;
        } else {
            console.error('[BroadcastManager] No transaction ID available in result:', result);
            return;
        }

        if (txidElement) {
            txidElement.textContent = txidToDisplay;
        }

        if (explorerLinkElement) {
            const explorerUrl = getExplorerUrl(txidToDisplay);
            explorerLinkElement.href = explorerUrl;
            explorerLinkElement.style.display = 'inline-block';
        }
    }

    /**
     * Display error details
     */
    displayErrorDetails(error) {
        const txidElement = document.getElementById('broadcastTxid');
        const explorerLinkElement = document.getElementById('explorerLink');

        if (txidElement) {
            txidElement.textContent = 'Error occurred';
            txidElement.style.color = '#ef4444';
        }

        if (explorerLinkElement) {
            explorerLinkElement.style.display = 'none';
        }
    }

    /**
     * Enable broadcast button
     */
    enableBroadcastButton(text) {
        if (this.broadcastBtn) {
            this.broadcastBtn.disabled = false;
            this.broadcastBtn.classList.remove('disabled');
            this.broadcastBtn.style.pointerEvents = 'auto';
            this.broadcastBtn.style.opacity = '1';
            this.broadcastBtn.style.cursor = 'pointer';
            this.broadcastBtn.innerHTML = `<span>${text}</span>`;
        }
    }

    /**
     * Disable broadcast button
     */
    disableBroadcastButton(text) {
        if (this.broadcastBtn) {
            this.broadcastBtn.disabled = true;
            this.broadcastBtn.classList.add('disabled');
            this.broadcastBtn.innerHTML = `<span>${text}</span>`;
            // Remove inline styles that override CSS disabled state
            this.broadcastBtn.style.pointerEvents = '';
            this.broadcastBtn.style.opacity = '';
            this.broadcastBtn.style.cursor = '';
        }
    }

    /**
     * Show broadcast display
     */
    showBroadcastDisplay() {
        if (this.broadcastDisplay) {
            this.broadcastDisplay.style.display = 'block';
        }
    }

    /**
     * Hide broadcast display
     */
    hideBroadcastDisplay() {
        if (this.broadcastDisplay) {
            this.broadcastDisplay.style.display = 'none';
        }
    }

    /**
     * Get current broadcast result
     */
    getBroadcastResult() {
        return this.broadcastResult;
    }

    /**
     * Check if broadcasting is available
     */
    isBroadcastingAvailable() {
        return this.currentTransaction !== null;
    }



    /**
     * Show minting transactions summary in Step 5 when current step is 6
     */
    showBroadcastSummaryInStep5() {
        const claimMintingSummary = document.getElementById('claimMintingSummary');
        const claimCommitTxid = document.getElementById('claimCommitTxid');
        const claimCommitExplorerLink = document.getElementById('claimCommitExplorerLink');
        const claimSpellTxid = document.getElementById('claimSpellTxid');
        const claimSpellExplorerLink = document.getElementById('claimSpellExplorerLink');
        
        if (!claimMintingSummary) {
            console.warn('[BroadcastManager] Claim minting summary element not found');
            return;
        }

        // Get minting transactions from localStorage (signed transactions)
        let commitTxid = null;
        let spellTxid = null;
        
        try {
            const signedTxData = localStorage.getItem('bro_signed_transactions');
            if (signedTxData) {
                const signedData = JSON.parse(signedTxData);
                console.log('[BroadcastManager] 🔍 Found signed transactions data:', signedData);
                
                if (signedData.transactions && Array.isArray(signedData.transactions)) {
                    // Extract commit and spell transaction IDs
                    const commitTx = signedData.transactions.find(tx => tx.type === 'commit');
                    const spellTx = signedData.transactions.find(tx => tx.type === 'spell');
                    
                    commitTxid = commitTx?.txid;
                    spellTxid = spellTx?.txid;
                    
                    console.log('[BroadcastManager] 📋 Extracted transaction IDs:', { commitTxid, spellTxid });
                }
            }
        } catch (error) {
            console.warn('[BroadcastManager] Error parsing signed transactions:', error);
        }
        
        // Show the summary box regardless of data availability
        claimMintingSummary.style.display = 'block';
        
        // Update commit transaction
        if (claimCommitTxid && commitTxid) {
            claimCommitTxid.textContent = commitTxid;
            
            if (claimCommitExplorerLink) {
                const commitExplorerUrl = getExplorerUrl(commitTxid);
                claimCommitExplorerLink.href = commitExplorerUrl;
                claimCommitExplorerLink.style.display = 'inline';
            }
        } else if (claimCommitTxid) {
            claimCommitTxid.textContent = '-';
        }
        
        // Update spell transaction
        if (claimSpellTxid && spellTxid) {
            claimSpellTxid.textContent = spellTxid;
            
            if (claimSpellExplorerLink) {
                const spellExplorerUrl = getExplorerUrl(spellTxid);
                claimSpellExplorerLink.href = spellExplorerUrl;
                claimSpellExplorerLink.style.display = 'inline';
            }
        } else if (claimSpellTxid) {
            claimSpellTxid.textContent = '-';
        }
        
        if (commitTxid || spellTxid) {
            console.log('[BroadcastManager] ✅ Minting transactions summary populated:', { commitTxid, spellTxid });
        } else {
            console.log('[BroadcastManager] ❌ No minting transaction data found');
        }
    }
}
