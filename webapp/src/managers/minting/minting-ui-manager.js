// UI management for minting process
export class MintingUIManager {
    constructor(steps) {
        this.steps = steps;
        this.countdownInterval = null;
    }

    // Initialize UI for step 5 process
    initializeUI() {
        const step5Container = document.createElement('div');
        step5Container.id = 'step5-progress';
        step5Container.className = 'step5-progress-container';

        const title = document.createElement('h3');
        title.textContent = 'BRO Token Minting Process';
        step5Container.appendChild(title);

        const stepsContainer = document.createElement('div');
        stepsContainer.className = 'steps-container';

        this.steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = 'step-item pending';
            stepElement.id = `step-${index}`;

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

        step5Container.appendChild(stepsContainer);

        const claimSection = document.querySelector('.claim-section');
        if (claimSection) {
            claimSection.appendChild(step5Container);
        }

        console.log('🎨 Minting UI initialized');
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
                    'completed': 'Completed ✅',
                    'error': 'Error ❌'
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

        const explorerUrl = `https://mempool.space/testnet4/tx/${txid}`;

        if (progress.status === 'pending') {
            progressElement.style.display = 'block';
            
            let errorInfo = '';
            if (progress.consecutiveErrors > 0) {
                errorInfo = `<div class="warning-line">⚠️ ${progress.consecutiveErrors} consecutive errors - using backoff delay</div>`;
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
                    <span>✅ Confirmed in block ${progress.blockHeight} with ${progress.confirmations} confirmations</span>
                </div>
            `;
        } else if (progress.status === 'error') {
            progressElement.style.display = 'block';
            
            const networkErrorInfo = progress.isNetworkError ? 
                '<div class="network-error-info">🌐 Network connectivity issue detected</div>' : '';
            
            const retryInfo = progress.canRetry ? 
                '<div class="retry-info">🔄 Will automatically retry with backoff delay</div>' : 
                '<div class="critical-info">⚠️ Too many consecutive errors - manual intervention may be needed</div>';

            progressElement.innerHTML = `
                <div class="error-container">
                    <div class="error-header">❌ Error: ${progress.error}</div>
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
                    <div class="critical-header">🚨 Critical Error - Manual Intervention Required</div>
                    <div class="error-message">❌ ${progress.error}</div>
                    <div class="error-stats">
                        <small>Attempts: ${progress.retries + 1} | Consecutive errors: ${progress.consecutiveErrors}</small>
                    </div>
                    <div class="recovery-options">
                        <button onclick="window.mintingManager?.resetConfirmationErrors()" class="retry-button">
                            🔄 Reset & Continue Monitoring
                        </button>
                        <button onclick="window.mintingManager?.cancelMonitoring()" class="cancel-button">
                            ⏹️ Stop Monitoring
                        </button>
                    </div>
                    <div class="explorer-line">
                        <a href="${explorerUrl}" target="_blank" class="explorer-link">Check Transaction Status Manually</a>
                    </div>
                    <div class="help-text">
                        <small>💡 Check your internet connection and transaction status. If the transaction is confirmed, click "Reset & Continue".</small>
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
                <h5>📋 Payload for Review:</h5>
                <div class="payload-summary">
                    <p><strong>Size:</strong> ${Math.round(payloadJson.length / 1024)} KB</p>
                    <p><strong>WASM Binary:</strong> ${payload.binaries ? Object.keys(payload.binaries).length : 0} files</p>
                    <p><strong>Transactions:</strong> ${payload.prev_txs ? payload.prev_txs.length : 0}</p>
                </div>
                <textarea class="payload-text" readonly rows="15" cols="80">${payloadJson}</textarea>
                <div class="payload-actions">
                    <button onclick="navigator.clipboard.writeText(this.parentElement.previousElementSibling.value)" class="copy-button">📋 Copy to Clipboard</button>
                </div>
            </div>
        `;

        console.log('📋 Payload displayed in UI for review');
    }

    // Show success message
    showSuccess(broadcastResults) {
        const step5Container = document.getElementById('step5-progress');
        if (!step5Container) return;

        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.innerHTML = `
            <h4>🎉 BRO Tokens Successfully Minted!</h4>
            <p>Your BRO tokens have been minted and are now available in your wallet.</p>
            <div class="results-summary">
                <p><strong>Transactions Broadcasted:</strong> ${broadcastResults?.length || 0}</p>
                <p><strong>Final Status:</strong> Complete</p>
            </div>
        `;

        step5Container.appendChild(successMessage);
    }

    // Show error message
    showError(errorMessage) {
        const step5Container = document.getElementById('step5-progress');
        if (!step5Container) return;

        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.innerHTML = `
            <h4>❌ Minting Process Failed</h4>
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
