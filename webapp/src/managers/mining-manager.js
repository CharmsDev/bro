import { calculateRewardInfo, leadingZeros } from '../mining/reward-calculator.js';

export class MiningManager {
    constructor(domElements, stepController, appState, miner) {
        this.dom = domElements;
        this.stepController = stepController;
        this.appState = appState;
        this.miner = miner;
    }

    // Format hash with highlighted leading zeros using the reward calculator function
    formatHashWithLeadingZeros(hash) {
        if (!hash || hash === 'Calculating...' || hash === 'Waiting to start...' || hash === 'No best hash yet...' || hash === 'Searching for best hash...') {
            return hash;
        }

        // Use the same function as reward calculator
        const leadingZeroBits = leadingZeros(hash);

        if (leadingZeroBits === 0) {
            return `<span class="hash-remainder">${hash}</span>`;
        }

        // Calculate how many full hex characters are zeros
        const fullHexZeros = Math.floor(leadingZeroBits / 4);
        const remainingBits = leadingZeroBits % 4;

        let highlightedPart = '';
        let remainderPart = '';

        if (fullHexZeros > 0) {
            // Highlight full hex zeros
            highlightedPart = hash.substring(0, fullHexZeros);
        }

        if (remainingBits > 0 && fullHexZeros < hash.length) {
            // Highlight the next character that has partial leading zeros
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


    // Update hash display with enhanced formatting
    updateHashDisplay(elementId, hash, isNewBest = false) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const formattedHash = this.formatHashWithLeadingZeros(hash);
        element.innerHTML = formattedHash;

        if (isNewBest && hash && hash !== 'No best hash yet...' && hash !== 'Searching for best hash...') {
            // Add celebration animation
            element.classList.remove('new-best-found');
            // Force reflow to restart animation
            element.offsetHeight;
            element.classList.add('new-best-found');

            // Remove animation class after animation completes
            setTimeout(() => {
                element.classList.remove('new-best-found');
            }, 2000);
        }
    }

    initialize() {
        this.setupEventListeners();
        this.checkExistingMiningState();

        if (!this.appState.canStartMining()) {
            this.stepController.initializeMiningStep();
        }
    }

    checkExistingMiningState() {
        if (!this.miner) return;

        const miningResult = this.miner.loadMiningResult();
        if (miningResult) {
            this.restoreCompletedMining(miningResult);
            return;
        }

        const miningProgress = this.miner.loadMiningProgress();
        if (miningProgress) {
            this.offerResumeOption(miningProgress);
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

    offerResumeOption(progress) {
        const resumeMessage = `Found previous mining progress at nonce ${progress.nonce.toLocaleString()}. Would you like to resume?`;
        if (confirm(resumeMessage)) {
            this.resumeMining(progress);
        }
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


                this.dom.show('miningDisplay');
                startMining.style.display = 'none';
                const stopMining = this.dom.get('stopMining');
                if (stopMining) stopMining.style.display = 'inline-block';
                this.dom.hide('successMessage');

                this.dom.setText('status', 'Mining...');
                const status = this.dom.get('status');
                if (status) status.className = 'stat-value mining';
                this.dom.setText('nonce', '0');
                this.dom.setText('currentHash', 'Calculating...');
                this.dom.setText('currentLeadingZeros', '0');
                this.dom.setText('bestHash', 'Searching for best hash...');
                this.dom.setText('bestNonce', '0');
                this.dom.setText('bestLeadingZeros', '0');

                const utxo = this.appState.utxo;
                await this.miner.startPoW(
                    (progress) => this.updateMiningProgress(progress),
                    (result) => this.completeMining(result),
                    false,
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

                this.dom.setText('status', 'Stopped');
                const status = this.dom.get('status');
                if (status) status.className = 'stat-value stopped';

                const startMining = this.dom.get('startMining');
                if (startMining) startMining.style.display = 'inline-block';
                stopMining.style.display = 'none';
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

        // Update real-time reward calculation based on best hash found
        if (progress.bestHash && progress.bestNonce) {
            this.displayTokenReward(progress.bestNonce, progress.bestHash);
        }

        // Progress bar based on best leading zeros found (visual indicator)
        const progressPercent = Math.min((bestLeadingZeros / 20) * 100, 95);
        const progressFill = this.dom.get('progressFill');
        if (progressFill) progressFill.style.width = progressPercent + '%';

        // Hash color indication for current hash
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

        // Calculate and display token reward based on best hash
        this.displayTokenReward(result.bestNonce, result.bestHash);

        // Get the reward amount for the success message
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

        this.appState.completeMining(result);
    }

    displayTokenReward(nonce, hash) {
        try {
            const rewardInfo = calculateRewardInfo(nonce, hash);


            // Update reward display elements
            this.dom.setText('tokenReward', rewardInfo.formattedAmount);
            this.dom.setText('proofOfWork', `${rewardInfo.leadingZeros} leading zeros`);

        } catch (error) {
            console.error('💰 Error calculating token reward:', error);
        }
    }
}
