import { calculateRewardInfo, leadingZeros } from '../mining/reward-calculator.js';

export class MiningManager {
    constructor(domElements, stepController, appState, miner) {
        this.dom = domElements;
        this.stepController = stepController;
        this.appState = appState;
        this.miner = miner;
    }

    /**
     * Format hash with highlighted leading zeros
     * @param {string} hash - Hash to format
     * @returns {string} HTML formatted hash with highlighted leading zeros
     */
    formatHashWithLeadingZeros(hash) {
        if (!hash || hash === 'Calculating...' || hash === 'Waiting to start...' || hash === 'No best hash yet...' || hash === 'Searching for best hash...') {
            return hash;
        }

        const leadingZeroBits = leadingZeros(hash);

        if (leadingZeroBits === 0) {
            return `<span class="hash-remainder">${hash}</span>`;
        }

        const fullHexZeros = Math.floor(leadingZeroBits / 4);
        const remainingBits = leadingZeroBits % 4;

        let highlightedPart = '';
        let remainderPart = '';

        if (fullHexZeros > 0) {
            highlightedPart = hash.substring(0, fullHexZeros);
        }

        if (remainingBits > 0 && fullHexZeros < hash.length) {
            highlightedPart += hash[fullHexZeros];
            remainderPart = hash.substring(fullHexZeros + 1);
        } else {
            remainderPart = hash.substring(fullHexZeros);
        }

        if (highlightedPart) {
            return `<span class="leading-zeros">${highlightedPart}</span><span class="hash-remainder">${remainderPart}</span>`;
        } else {
            return `<span class="hash-remainder">${hash}</span>`;
        }
    }


    /**
     * Update hash display with formatting and animations
     * @param {string} elementId - Element ID to update
     * @param {string} hash - Hash to display
     * @param {boolean} isNewBest - Whether this is a new best hash
     */
    updateHashDisplay(elementId, hash, isNewBest = false) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const formattedHash = this.formatHashWithLeadingZeros(hash);
        element.innerHTML = formattedHash;

        if (isNewBest && hash && hash !== 'No best hash yet...' && hash !== 'Searching for best hash...') {
            element.classList.remove('new-best-found');
            element.offsetHeight;
            element.classList.add('new-best-found');

            setTimeout(() => {
                element.classList.remove('new-best-found');
            }, 2000);
        }
    }

    initialize() {
        this.setupEventListeners();
        this.checkExistingMiningState();
        this.updateButtonText();

        if (!this.appState.canStartMining()) {
            this.stepController.initializeMiningStep();
        }
    }

    /**
     * Reset mining manager to initial state
     */
    reset() {
        // Hide mining display
        this.dom.hide('miningDisplay');

        // Reset UI elements to initial state
        this.dom.setText('status', 'Ready to start mining');
        this.dom.setText('nonce', '0');
        this.dom.setText('currentZeroBits', '0');
        this.updateHashDisplay('currentHash', 'Waiting to start...');
        this.updateHashDisplay('bestHash', 'No best hash yet...');
        this.dom.setText('bestNonce', '0');
        this.dom.setText('bestLeadingZeros', '0');

        // Reset buttons
        const startMining = this.dom.get('startMining');
        const stopMining = this.dom.get('stopMining');
        if (startMining) {
            startMining.style.display = 'inline-block';
            startMining.disabled = true; // Will be enabled when conditions are met
        }
        if (stopMining) {
            stopMining.style.display = 'none';
        }

        // Hide success message
        this.dom.hide('successMessage');

        // Reset progress bar
        const progressFill = this.dom.get('progressFill');
        if (progressFill) progressFill.style.width = '0%';

    }

    checkExistingMiningState() {
        if (!this.miner) {
            return;
        }


        // First check for progress (Stop & Claim scenario)
        const miningProgress = this.miner.loadMiningProgress();

        if (miningProgress) {

            // Check if transaction exists - if so, show disabled state but with mining data
            if (this.appState.transaction) {
                this.showMiningDisabledWithData(miningProgress);
            } else {
                this.offerResumeOption(miningProgress);
            }
            return;
        }

        // Only check for completed result if no progress exists
        const miningResult = this.miner.loadMiningResult();

        if (miningResult) {

            // Check if transaction exists - if so, show disabled state but with mining data
            if (this.appState.transaction) {
                this.showMiningDisabledWithData(miningResult);
            } else {
                this.restoreCompletedMining(miningResult);
            }
        } else {
        }
    }

    restoreCompletedMining(result) {
        this.dom.show('miningDisplay');

        this.dom.setText('status', 'Stopped - Best Result Found!');
        const status = this.dom.get('status');
        if (status) status.className = 'stat-value success';

        this.dom.setText('nonce', result.nonce.toLocaleString());
        this.updateHashDisplay('currentHash', result.hash);
        this.updateHashDisplay('bestHash', result.bestHash || result.hash);
        this.dom.setText('bestNonce', (result.bestNonce || result.nonce).toLocaleString());
        this.dom.setText('bestLeadingZeros', result.bestLeadingZeros || 0);

        this.dom.setText('finalNonce', result.nonce.toLocaleString());
        this.updateHashDisplay('finalHash', result.hash);
        this.dom.show('successMessage');

        // Calculate and display token reward for restored state
        this.displayTokenReward(result.nonce, result.hash);

        this.appState.completeMining(result);
    }

    showMiningDisabled() {
        // Show mining display but with disabled state
        this.dom.show('miningDisplay');

        // Get the mining result that was used for the transaction
        const miningResult = this.miner.loadMiningResult();
        if (miningResult) {
            // Show the mining data that was used
            this.dom.setText('nonce', miningResult.nonce.toLocaleString());
            this.updateHashDisplay('currentHash', miningResult.hash);
            this.updateHashDisplay('bestHash', miningResult.bestHash || miningResult.hash);
            this.dom.setText('bestNonce', (miningResult.bestNonce || miningResult.nonce).toLocaleString());
            this.dom.setText('bestLeadingZeros', miningResult.bestLeadingZeros || 0);

            // Display the token reward
            this.displayTokenReward(miningResult.nonce, miningResult.hash);

            // Update progress bar
            const bestLeadingZeros = miningResult.bestLeadingZeros || 0;
            const progressPercent = Math.min((bestLeadingZeros / 20) * 100, 95);
            const progressFill = this.dom.get('progressFill');
            if (progressFill) progressFill.style.width = progressPercent + '%';
        }

        // Set status to disabled
        this.dom.setText('status', 'Mining Disabled');
        const status = this.dom.get('status');
        if (status) status.className = 'stat-value disabled';

        // Hide and disable buttons
        const startMining = this.dom.get('startMining');
        const stopMining = this.dom.get('stopMining');
        if (startMining) {
            startMining.style.display = 'none';
        }
        if (stopMining) {
            stopMining.style.display = 'none';
        }

        // Hide success message since this is disabled state
        this.dom.hide('successMessage');

    }

    showMiningDisabledWithData(miningData) {
        // Show mining display with the provided data but in disabled state
        this.dom.show('miningDisplay');

        // Set status to disabled
        this.dom.setText('status', 'Mining Disabled');
        const status = this.dom.get('status');
        if (status) status.className = 'stat-value disabled';

        // Show the mining data
        this.dom.setText('nonce', miningData.nonce.toLocaleString());
        this.updateHashDisplay('currentHash', miningData.hash);

        // Calculate current leading zeros
        if (this.miner) {
            this.dom.setText('currentLeadingZeros', this.miner.countLeadingZeroBits(miningData.hash));
        }

        // Show best hash data
        if (miningData.bestHash) {
            this.updateHashDisplay('bestHash', miningData.bestHash);
            this.dom.setText('bestNonce', miningData.bestNonce.toLocaleString());
            this.dom.setText('bestLeadingZeros', miningData.bestLeadingZeros);

            // Display token reward for the best result
            this.displayTokenReward(miningData.bestNonce, miningData.bestHash);

            // Update progress bar
            const progressPercent = Math.min((miningData.bestLeadingZeros / 20) * 100, 95);
            const progressFill = this.dom.get('progressFill');
            if (progressFill) progressFill.style.width = progressPercent + '%';
        } else {
            this.updateHashDisplay('bestHash', 'No best hash yet...');
            this.dom.setText('bestNonce', '0');
            this.dom.setText('bestLeadingZeros', '0');
            this.dom.setText('tokenReward', '-');
            this.dom.setText('proofOfWork', '-');
        }

        // Hide and disable buttons
        const startMining = this.dom.get('startMining');
        const stopMining = this.dom.get('stopMining');
        if (startMining) {
            startMining.style.display = 'none';
        }
        if (stopMining) {
            stopMining.style.display = 'none';
        }

        // Hide success message since this is disabled state
        this.dom.hide('successMessage');

    }

    offerResumeOption(progress) {
        // Show the saved progress state without auto-starting mining
        this.restoreProgressState(progress);
    }

    restoreProgressState(progress) {

        // Show mining display with saved progress but don't start mining
        this.dom.show('miningDisplay');

        // Check if miningDisplay is actually visible
        const miningDisplay = document.getElementById('miningDisplay');

        this.dom.setText('status', 'Stopped - Progress Saved');
        const status = this.dom.get('status');
        if (status) status.className = 'stat-value stopped';

        // Restore all the saved values
        this.dom.setText('nonce', progress.nonce.toLocaleString());

        this.updateHashDisplay('currentHash', progress.hash);

        this.dom.setText('currentLeadingZeros', this.miner.countLeadingZeroBits(progress.hash));

        if (progress.bestHash) {
            this.updateHashDisplay('bestHash', progress.bestHash);
            this.dom.setText('bestNonce', progress.bestNonce.toLocaleString());
            this.dom.setText('bestLeadingZeros', progress.bestLeadingZeros);

            // Display token reward for the best result found so far
            this.displayTokenReward(progress.bestNonce, progress.bestHash);
        } else {
            this.updateHashDisplay('bestHash', 'No best hash yet...');
            this.dom.setText('bestNonce', '0');
            this.dom.setText('bestLeadingZeros', '0');
            // Clear reward display if no best hash yet
            this.dom.setText('tokenReward', '-');
            this.dom.setText('proofOfWork', '-');
        }

        // Update progress bar based on best leading zeros
        const bestLeadingZeros = progress.bestLeadingZeros || 0;
        const progressPercent = Math.min((bestLeadingZeros / 20) * 100, 95);
        const progressFill = this.dom.get('progressFill');
        if (progressFill) progressFill.style.width = progressPercent + '%';

        // Ensure all display elements are visible
        const rewardDisplay = document.getElementById('rewardDisplay');
        if (rewardDisplay) {
            rewardDisplay.style.display = 'block';
        }

        // Debug: Check all key elements are found and visible
        const elementsToCheck = [
            'miningDisplay', 'nonce', 'currentHash', 'currentLeadingZeros',
            'bestHash', 'bestNonce', 'bestLeadingZeros', 'status',
            'tokenReward', 'proofOfWork', 'rewardDisplay'
        ];

        elementsToCheck.forEach(elementId => {
            document.getElementById(elementId);
        });

        // Ensure buttons are in correct state (Start button visible, Stop button hidden)
        const startMining = this.dom.get('startMining');
        const stopMining = this.dom.get('stopMining');
        if (startMining) startMining.style.display = 'inline-block';
        if (stopMining) stopMining.style.display = 'none';

        // Hide success message since this is progress, not completion
        this.dom.hide('successMessage');
    }

    async resumeMining(progress) {
        this.dom.show('miningDisplay');

        this.dom.setText('status', 'Resuming...');
        const status = this.dom.get('status');
        if (status) status.className = 'stat-value mining';

        this.dom.setText('nonce', progress.nonce.toLocaleString());
        this.dom.setText('currentHash', progress.hash);
        this.dom.setText('bestHash', progress.bestHash || '');
        this.dom.setText('bestNonce', (progress.bestNonce || 0).toLocaleString());
        this.dom.setText('bestLeadingZeros', progress.bestLeadingZeros || 0);

        const startMining = this.dom.get('startMining');
        const stopMining = this.dom.get('stopMining');
        if (startMining) startMining.style.display = 'none';
        if (stopMining) stopMining.style.display = 'inline-block';

        this.dom.hide('successMessage');

        const utxo = this.appState.utxo;
        if (!utxo) {
            throw new Error('Cannot resume Proof of Work: No UTXO found in appState. Please ensure monitoring has completed.');
        }

        await this.miner.startPoW(
            (progress) => this.updateMiningProgress(progress),
            (result) => this.completeMining(result),
            true,
            utxo
        );
    }

    setupEventListeners() {
        this.setupStartMiningButton();
        this.setupStopMiningButton();
    }

    setupStartMiningButton() {
        const startMining = this.dom.get('startMining');
        if (startMining) {
            startMining.addEventListener('click', async () => {
                // Check if we have existing mining progress or completed mining
                const miningResult = this.miner.loadMiningResult();
                const miningProgress = this.miner.loadMiningProgress();
                const shouldResume = miningProgress && !miningResult;

                this.dom.show('miningDisplay');
                startMining.style.display = 'none';
                const stopMining = this.dom.get('stopMining');
                if (stopMining) stopMining.style.display = 'inline-block';
                this.dom.hide('successMessage');

                if (shouldResume) {
                    // Resume from existing progress
                    this.dom.setText('status', 'Resuming...');
                    const status = this.dom.get('status');
                    if (status) status.className = 'stat-value mining';

                    // Restore previous state
                    this.dom.setText('nonce', miningProgress.nonce.toLocaleString());
                    this.updateHashDisplay('currentHash', miningProgress.hash);
                    this.dom.setText('currentLeadingZeros', this.miner.countLeadingZeroBits(miningProgress.hash));

                    if (miningProgress.bestHash) {
                        this.updateHashDisplay('bestHash', miningProgress.bestHash);
                        this.dom.setText('bestNonce', miningProgress.bestNonce.toLocaleString());
                        this.dom.setText('bestLeadingZeros', miningProgress.bestLeadingZeros);
                    } else {
                        this.updateHashDisplay('bestHash', 'Searching for best hash...');
                        this.dom.setText('bestNonce', '0');
                        this.dom.setText('bestLeadingZeros', '0');
                    }
                } else {
                    // Start fresh mining (either first time or starting new after completion)
                    this.dom.setText('status', 'Mining...');
                    const status = this.dom.get('status');
                    if (status) status.className = 'stat-value mining';
                    this.dom.setText('nonce', '0');
                    this.updateHashDisplay('currentHash', 'Calculating...');
                    this.dom.setText('currentLeadingZeros', '0');
                    this.updateHashDisplay('bestHash', 'Searching for best hash...');
                    this.dom.setText('bestNonce', '0');
                    this.dom.setText('bestLeadingZeros', '0');

                    // Clear any existing reward display
                    this.dom.setText('tokenReward', '-');
                    this.dom.setText('proofOfWork', '-');
                }

                const utxo = this.appState.utxo;
                await this.miner.startPoW(
                    (progress) => this.updateMiningProgress(progress),
                    (result) => this.completeMining(result),
                    shouldResume,
                    utxo
                );
            });
        }
    }

    setupStopMiningButton() {
        const stopMining = this.dom.get('stopMining');
        if (stopMining) {
            stopMining.addEventListener('click', () => {
                if (this.miner) {
                    this.miner.stop();
                }

                this.dom.setText('status', 'Stopped - Progress Saved');
                const status = this.dom.get('status');
                if (status) status.className = 'stat-value stopped';

                const startMining = this.dom.get('startMining');
                if (startMining) startMining.style.display = 'inline-block';
                stopMining.style.display = 'none';

                // Update button text after stopping
                this.updateButtonText();
            });
        }
    }

    updateMiningProgress(progress) {
        // Use the values directly from the miner (they are already calculated correctly)
        const currentLeadingZeros = progress.leadingZeroBits;
        const bestLeadingZeros = progress.bestLeadingZeros;

        // Update current mining stats
        this.dom.setText('nonce', progress.nonce.toLocaleString());
        this.dom.setText('currentLeadingZeros', currentLeadingZeros);

        // Update current hash with enhanced formatting
        this.updateHashDisplay('currentHash', progress.hash);

        // Update best hash found so far
        this.dom.setText('bestNonce', progress.bestHash ? progress.bestNonce.toLocaleString() : '-');
        this.dom.setText('bestLeadingZeros', bestLeadingZeros);

        // Handle new best hash with enhanced effects
        if (progress.isNewBest && progress.bestHash) {
            // Update best hash with celebration animation
            this.updateHashDisplay('bestHash', progress.bestHash, true);

            // Update best hash element class for additional styling
            const bestHashElement = this.dom.get('bestHash');
            if (bestHashElement) {
                bestHashElement.className = 'hash-value best';
            }
        } else if (progress.bestHash) {
            // Update best hash without animation
            this.updateHashDisplay('bestHash', progress.bestHash);
        } else {
            // No best hash yet
            this.updateHashDisplay('bestHash', 'No best hash yet...');
        }

        if (progress.bestHash && progress.bestNonce) {
            this.displayTokenReward(progress.bestNonce, progress.bestHash);
        }

        const progressPercent = Math.min((bestLeadingZeros / 20) * 100, 95);
        const progressFill = this.dom.get('progressFill');
        if (progressFill) progressFill.style.width = progressPercent + '%';
        const currentHash = this.dom.get('currentHash');
        if (currentHash) {
            if (currentLeadingZeros >= 15) {
                currentHash.className = 'hash-value excellent';
            } else if (currentLeadingZeros >= 10) {
                currentHash.className = 'hash-value good';
            } else if (currentLeadingZeros >= 5) {
                currentHash.className = 'hash-value decent';
            } else {
                currentHash.className = 'hash-value';
            }
        }
    }

    completeMining(result) {
        this.dom.setText('status', 'Stopped - Best Result Found!');
        const status = this.dom.get('status');
        if (status) status.className = 'stat-value success';

        // Update the best hash section with final results
        this.updateHashDisplay('bestHash', result.bestHash);
        this.dom.setText('bestNonce', result.bestNonce.toLocaleString());
        this.dom.setText('bestLeadingZeros', result.bestLeadingZeros);

        this.displayTokenReward(result.bestNonce, result.bestHash);

        let finalRewardAmount = '-';
        try {
            const rewardInfo = calculateRewardInfo(result.bestNonce, result.bestHash);
            finalRewardAmount = rewardInfo.formattedAmount;
        } catch (error) {
            console.error('Error calculating final reward:', error);
        }

        // Show the best result found in success message with reward
        this.dom.setText('finalNonce', result.bestNonce.toLocaleString());
        this.updateHashDisplay('finalHash', result.bestHash);
        this.dom.setText('finalLeadingZeros', result.bestLeadingZeros);
        this.dom.setText('finalTokenReward', finalRewardAmount);
        this.dom.show('successMessage');

        const startMining = this.dom.get('startMining');
        const stopMining = this.dom.get('stopMining');
        if (startMining) startMining.style.display = 'inline-block';
        if (stopMining) stopMining.style.display = 'none';

        // Update button text after completing mining
        this.updateButtonText();

        this.appState.completeMining(result);
    }

    /**
     * Display token reward information
     * @param {number} nonce - Mining nonce
     * @param {string} hash - Hash result
     */
    displayTokenReward(nonce, hash) {
        try {
            const rewardInfo = calculateRewardInfo(nonce, hash);
            this.dom.setText('tokenReward', rewardInfo.formattedAmount);
            this.dom.setText('proofOfWork', `${rewardInfo.leadingZeros} leading zeros`);
        } catch (error) {
            console.error('Error calculating token reward:', error);
        }
    }

    /**
     * Update button text based on mining state
     */
    updateButtonText() {
        const startMining = this.dom.get('startMining');
        if (!startMining) return;

        const buttonSpan = startMining.querySelector('span');
        if (!buttonSpan) return;

        // Check if transaction exists - if so, disable mining
        if (this.appState.transaction) {
            buttonSpan.textContent = 'Mining Disabled';
            startMining.disabled = true;
            startMining.classList.add('disabled');
            startMining.style.pointerEvents = 'none';
            startMining.style.opacity = '0.5';
            return;
        }

        // Check if there's existing mining progress or completed mining
        const miningResult = this.miner ? this.miner.loadMiningResult() : null;
        const miningProgress = this.miner ? this.miner.loadMiningProgress() : null;

        if (miningResult) {
            // Mining is completed, show "Start New Mining"
            buttonSpan.textContent = 'Start New Mining';
        } else if (miningProgress) {
            // There's progress to resume, show "Continue Mining"
            buttonSpan.textContent = 'Continue Mining';
        } else {
            // No previous state, show default "Start Mining"
            buttonSpan.textContent = 'Start Mining';
        }
    }
}
