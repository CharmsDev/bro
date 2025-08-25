// UI management for minting process
export class MintingUIManager {
    constructor(steps) {
        this.steps = steps;
        this.countdownInterval = null;
        this._broadcastShown = false;
    }

    // FRESH START: Initialize UI when user clicks Step 5 button (coming from Step 4)
    initializeForFreshStart() {
        // Avoid duplicate containers
        if (document.getElementById('step5-progress')) return;

        this._createStep5Container();

        // Show the steps container - we're starting fresh
        const stepsContainer = document.querySelector('#step5-progress .steps-container');
        if (stepsContainer) {
            stepsContainer.style.display = 'block';
        }

        // Show the title - we're starting fresh
        const header = document.querySelector('#step5-progress h3');
        if (header) {
            header.style.display = 'block';
        }
    }

    // PAGE REFRESH: Initialize UI when page reloads with existing broadcast data
    initializeForPageRefresh() {
        // Avoid duplicate containers
        if (document.getElementById('step5-progress')) return;

        this._createStep5Container();

        // Check for existing broadcast data and restore completion status
        this.checkAndRestoreBroadcastStatus();
    }

    // DEPRECATED: Keep for backward compatibility, but redirect to fresh start
    initializeUI() {
        console.warn('initializeUI() is deprecated. Use initializeForFreshStart() or initializeForPageRefresh()');
        this.initializeForFreshStart();
    }

    // Private method to create the base Step 5 container structure
    _createStep5Container() {
        const step5Container = document.createElement('div');
        step5Container.id = 'step5-progress';
        step5Container.className = 'step5-progress-container';

        // Hide the original static h3 title to avoid duplication
        const originalTitle = document.querySelector('.claim-section h3.step-title-5');
        if (originalTitle) {
            originalTitle.style.display = 'none';
        }

        const title = document.createElement('h3');
        title.textContent = 'BRO Token Minting Process';
        title.className = 'step-title step-title-5';
        step5Container.appendChild(title);

        const stepsContainer = document.createElement('div');
        stepsContainer.className = 'steps-container';
        step5Container.appendChild(stepsContainer);

        // Append to claim section
        const claimSection = document.querySelector('.claim-section');
        if (claimSection) {
            claimSection.appendChild(step5Container);
        }

        // Initialize the step elements
        this.initializeSteps(stepsContainer);
    }

    // Initialize the 6 step elements for the minting process
    initializeSteps(stepsContainer) {
        this.steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.id = `step-${index}`;
            stepElement.className = 'step-item pending';

            stepElement.innerHTML = `
                <div class="step-number">${index + 1}</div>
                <div class="step-content">
                    <div class="step-name">${step.name}</div>
                    <div class="step-status">Pending</div>
                    <div class="step-progress" style="display: none;"></div>
                </div>
            `;

            stepsContainer.appendChild(stepElement);
        });

    }

    // Check for existing broadcast data and restore completion status
    checkAndRestoreBroadcastStatus() {
        const broadcastData = localStorage.getItem('bro_broadcast_data');
        if (broadcastData) {
            try {
                const data = JSON.parse(broadcastData);

                // Only show completion status if we have a valid transaction ID
                const spellTxid = data.spellTxid || data?.spellData?.txid;
                if (spellTxid && typeof spellTxid === 'string' && spellTxid !== 'undefined' && spellTxid.length === 64) {
                    // Show completion status with transaction details
                    this.showBroadcastCompletionStatus(data);
                } else {
                    // Invalid or missing txid - show the steps UI instead
                    console.log('[Step5] Invalid txid found, showing steps UI instead of completion status');
                    this.showStepsUIAfterReload();
                }
            } catch (error) {
                // Parsing error - show steps UI
                console.log('[Step5] Error parsing broadcast data, showing steps UI');
                this.showStepsUIAfterReload();
            }
        } else {
            // No stored data - show steps UI
            this.showStepsUIAfterReload();
        }
    }

    // Show the steps UI when reloading without valid completion data
    showStepsUIAfterReload() {
        const step5Container = document.getElementById('step5-progress');
        if (!step5Container) return;

        // Show the steps container
        const stepsContainer = step5Container.querySelector('.steps-container');
        if (stepsContainer) {
            stepsContainer.style.display = 'block';
        }

        // Show the title
        const header = step5Container.querySelector('h3');
        if (header) {
            header.style.display = 'block';
        }

        // Remove any existing success message
        const existing = step5Container.querySelector('.step5-success-message');
        if (existing) {
            existing.remove();
        }
    }

    // Show broadcast completion status (for page refresh scenarios)
    showBroadcastCompletionStatus(broadcastData) {
        const step5Container = document.getElementById('step5-progress');
        if (!step5Container) return;

        // Hide steps list if present
        const stepsContainer = step5Container.querySelector('.steps-container');
        if (stepsContainer) stepsContainer.style.display = 'none';

        // Hide Step 5 title when restoring on reload
        const header = step5Container.querySelector('h3');
        if (header) header.style.display = 'none';

        // If a success box is already present, avoid adding another
        const existing = step5Container.querySelector('.step5-success-message');
        if (existing) return;

        // Get environment config for explorer links
        import('../../config/environment.js').then(({ environmentConfig }) => {
            const statusMessage = document.createElement('div');
            // Use dark broadcast panel style to match Step 4
            statusMessage.className = 'broadcast-display step5-success-message';

            const spellTxid = broadcastData.spellTxid;
            const explorerUrl = environmentConfig.getExplorerUrl(spellTxid);

            statusMessage.innerHTML = `
                <div class="broadcast-details">
                    <div class="broadcast-item">
                        <span class="broadcast-label">Status:</span>
                        <span class="status-value">BRO tokens minted and broadcast</span>
                    </div>
                    <div class="broadcast-item">
                        <span class="broadcast-label">Transaction ID:</span>
                        <span class="broadcast-value">${spellTxid}</span>
                    </div>
                    <div class="broadcast-item">
                        <span class="broadcast-label">Explorer:</span>
                        <a href="${explorerUrl}" target="_blank" class="explorer-link">View on Mempool.space</a>
                    </div>
                </div>
            `;

            if (step5Container) {
                step5Container.appendChild(statusMessage);
            }
        });
    }

    // Update step status in UI
    updateStepStatus(stepIndex, status) {
        const stepElement = document.getElementById(`step-${stepIndex}`);
        if (!stepElement) return;

        stepElement.classList.remove('pending', 'active', 'completed', 'error');
        stepElement.classList.add(status);

        const statusElement = stepElement.querySelector('.step-status');
        if (statusElement) {
            if (stepIndex === 0 && status === 'active') {
                statusElement.style.display = 'none';
            } else {
                statusElement.style.display = 'block';
                const statusText = {
                    'pending': 'Pending',
                    'active': 'In Progress...',
                    'completed': 'Completed ',
                    'error': 'Error '
                };
                statusElement.textContent = statusText[status] || status;
            }
        }

        this.steps[stepIndex].status = status;
    }

    // Update confirmation progress
    updateConfirmationProgress(progress, txid) {
        const stepElement = document.getElementById('step-0');
        if (!stepElement) return;

        const progressElement = stepElement.querySelector('.step-progress');
        if (!progressElement) return;

        const explorerUrl = `https://mempool.space/testnet4/tx/${txid}`; // Keep mempool.space for UI explorer links

        if (progress.status === 'pending') {
            progressElement.style.display = 'block';

            let errorInfo = '';
            if (progress.consecutiveErrors > 0) {
                errorInfo = `<div class="warning-line"> ${progress.consecutiveErrors} consecutive errors - using backoff delay</div>`;
            }

            progressElement.innerHTML = `
                <div class="confirmation-progress">
                    <div class="progress-line">
                        <div class="spinner"></div>
                        <span>In Progress... (next check in <span class="countdown" data-seconds="${progress.nextCheck}">${progress.nextCheck}</span>s)</span>
                    </div>
                    ${errorInfo}
                    <div class="explorer-line">
                        <a href="${explorerUrl}" target="_blank" class="explorer-link">View Transaction in Explorer</a>
                    </div>
                </div>
            `;

            this.startCountdown(progressElement.querySelector('.countdown'), progress.nextCheck);

        } else if (progress.status === 'confirmed') {
            progressElement.style.display = 'block';
            progressElement.innerHTML = `
                <div class="success-container">
                    <span> Confirmed in block ${progress.blockHeight} with ${progress.confirmations} confirmations</span>
                </div>
            `;
        } else if (progress.status === 'error') {
            progressElement.style.display = 'block';

            const networkErrorInfo = progress.isNetworkError ?
                '<div class="network-error-info"> Network connectivity issue detected</div>' : '';

            const retryInfo = progress.canRetry ?
                '<div class="retry-info"> Will automatically retry with backoff delay</div>' :
                '<div class="critical-info"> Too many consecutive errors - manual intervention may be needed</div>';

            progressElement.innerHTML = `
                <div class="error-container">
                    <div class="error-header"> Error: ${progress.error}</div>
                    ${networkErrorInfo}
                    <div class="error-details">
                        <small>Attempt: ${progress.retries + 1} | Consecutive errors: ${progress.consecutiveErrors}</small>
                    </div>
                    ${retryInfo}
                    <div class="explorer-line">
                        <a href="${explorerUrl}" target="_blank" class="explorer-link">Check Transaction Status</a>
                    </div>
                </div>
            `;
        } else if (progress.status === 'critical_error') {
            progressElement.style.display = 'block';
            progressElement.innerHTML = `
                <div class="critical-error-container">
                    <div class="critical-header"> Critical Error - Manual Intervention Required</div>
                    <div class="error-message"> ${progress.error}</div>
                    <div class="error-stats">
                        <small>Attempts: ${progress.retries + 1} | Consecutive errors: ${progress.consecutiveErrors}</small>
                    </div>
                    <div class="recovery-options">
                        <button onclick="window.mintingManager?.resetConfirmationErrors()" class="retry-button">
                            Reset & Continue Monitoring
                        </button>
                        <button onclick="window.mintingManager?.cancelMonitoring()" class="cancel-button">
                            Stop Monitoring
                        </button>
                    </div>
                    <div class="explorer-line">
                        <a href="${explorerUrl}" target="_blank" class="explorer-link">Check Transaction Status Manually</a>
                    </div>
                    <div class="help-text">
                        <small> Check your internet connection and transaction status. If the transaction is confirmed, click "Reset & Continue".</small>
                    </div>
                </div>
            `;
        }
    }

    // Start countdown timer
    startCountdown(countdownElement, seconds) {
        if (!countdownElement) return;

        let remaining = seconds;
        countdownElement.textContent = remaining;

        const interval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(interval);
                countdownElement.textContent = '0';
                return;
            }
            countdownElement.textContent = remaining;
        }, 1000);

        this.countdownInterval = interval;
    }

    // Show payload for review in UI
    showPayloadForReview(payload) {
        const stepElement = document.getElementById('step-3');
        if (!stepElement) return;

        const progressElement = stepElement.querySelector('.step-progress');
        if (!progressElement) return;

        const payloadJson = JSON.stringify(payload, null, 2);

        progressElement.style.display = 'block';
        progressElement.innerHTML = `
            <div class="payload-review">
                <h5> Payload for Review:</h5>
                <div class="payload-summary">
                    <p><strong>Size:</strong> ${Math.round(payloadJson.length / 1024)} KB</p>
                    <p><strong>WASM Binary:</strong> ${payload.binaries ? Object.keys(payload.binaries).length : 0} files</p>
                    <p><strong>Transactions:</strong> ${payload.prev_txs ? payload.prev_txs.length : 0}</p>
                </div>
                <textarea class="payload-text" readonly rows="15" cols="80">${payloadJson}</textarea>
                <div class="payload-actions">
                    <button onclick="navigator.clipboard.writeText(this.parentElement.previousElementSibling.value)" class="copy-button"> Copy to Clipboard</button>
                </div>
            </div>
        `;

    }

    // Show success message
    showSuccess(broadcastResults) {
        const step5Container = document.getElementById('step5-progress');
        if (!step5Container) return;

        // Hide steps list after success
        const stepsContainer = step5Container.querySelector('.steps-container');
        if (stepsContainer) stepsContainer.style.display = 'none';

        // Hide Step 5 title after success
        const header = step5Container.querySelector('h3');
        if (header) header.style.display = 'none';

        // If a success box is already present, avoid adding another
        const existing = step5Container.querySelector('.step5-success-message');
        if (existing) return;

        // Get environment config for explorer links
        import('../../config/environment.js').then(({ environmentConfig }) => {
            const successMessage = document.createElement('div');
            // Use dark broadcast panel style to match Step 4
            successMessage.className = 'broadcast-display step5-success-message';

            const commitTxid = broadcastResults?.commitData?.txid || 'N/A';
            const spellTxid = broadcastResults?.spellData?.txid || 'N/A';
            const explorerUrl = environmentConfig.getExplorerUrl(spellTxid);

            successMessage.innerHTML = `
                <div class="broadcast-details">
                    <div class="broadcast-item">
                        <span class="broadcast-label">Status:</span>
                        <span class="status-value">BRO tokens minted and broadcast</span>
                    </div>
                    <div class="broadcast-item">
                        <span class="broadcast-label">Commit Transaction ID:</span>
                        <span class="broadcast-value">${commitTxid}</span>
                    </div>
                    <div class="broadcast-item">
                        <span class="broadcast-label">Spell Transaction ID:</span>
                        <span class="broadcast-value">${spellTxid}</span>
                    </div>
                    <div class="broadcast-item">
                        <span class="broadcast-label">Explorer:</span>
                        <a href="${explorerUrl}" target="_blank" class="explorer-link">View on Mempool.space</a>
                    </div>
                </div>
            `;

            if (step5Container) {
                step5Container.appendChild(successMessage);
            }
        });
    }

    // Show error message
    showError(errorMessage) {
        const step5Container = document.getElementById('step5-progress');
        if (!step5Container) return;

        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.innerHTML = `
            <h4> Minting Process Failed</h4>
            <p>${errorMessage}</p>
            <button onclick="location.reload()" class="retry-button">Retry Process</button>
        `;

        step5Container.appendChild(errorElement);
    }

    // Cleanup
    cleanup() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
}
