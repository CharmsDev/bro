import { calculateRewardInfo, leadingZeros } from '../mining/reward-calculator.js';

export class MiningManager {
    constructor(domElements, stepController, appState, miner) {
        this.dom = domElements;
        this.stepController = stepController;
        this.appState = appState;
        this.miner = miner;
    }

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
        const startBtn = this.dom.get('startMining');
    }

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

        // Prioritize current nonce over completed results
        const miningProgress = this.miner.loadMiningProgress();

        if (miningProgress && miningProgress.nonce > 0) {
            // Show disabled state if transaction exists
            if (this.appState.transaction) {
                this.showMiningDisabledWithData(miningProgress);
            } else {
                this.offerResumeOption(miningProgress);
            }
            return;
        }

        // Only use current nonce storage
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

        // Show success box without redundant nonce/hash lines
        this.dom.show('successMessage');

        // Calculate and display token reward for restored state
        this.displayTokenReward(result.nonce, result.hash);

        this.appState.completeMining(result);
    }

    showMiningDisabled() {
        // Show disabled mining display
        this.dom.show('miningDisplay');

        // Use saved mining progress
        const miningProgress = this.miner.loadMiningProgress();
        if (miningProgress && miningProgress.nonce > 0) {
            this.dom.setText('nonce', miningProgress.nonce.toLocaleString());
            this.updateHashDisplay('currentHash', 'Mining in progress...');
            
            if (miningProgress.bestHash) {
                this.updateHashDisplay('bestHash', miningProgress.bestHash);
                this.dom.setText('bestNonce', miningProgress.bestNonce.toLocaleString());
                this.dom.setText('bestLeadingZeros', miningProgress.bestLeadingZeros);
                
                this.displayTokenReward(miningProgress.bestNonce, miningProgress.bestHash);
                
                const progressPercent = Math.min((miningProgress.bestLeadingZeros / 20) * 100, 95);
                const progressFill = this.dom.get('progressFill');
                if (progressFill) progressFill.style.width = progressPercent + '%';
            } else {
                this.updateHashDisplay('bestHash', 'No best hash yet...');
                this.dom.setText('bestNonce', '0');
                this.dom.setText('bestLeadingZeros', '0');
                this.dom.setText('tokenReward', '- $BRO');
                
                const progressFill = this.dom.get('progressFill');
                if (progressFill) progressFill.style.width = '0%';
            }
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
        // Show mining display in disabled state
        this.dom.show('miningDisplay');

        // Set status to disabled
        this.dom.setText('status', 'Mining Disabled');
        const status = this.dom.get('status');
        if (status) status.className = 'stat-value disabled';

        // Show current nonce
        this.dom.setText('nonce', miningData.nonce.toLocaleString());
        this.updateHashDisplay('currentHash', 'Mining stopped');

        // Show best hash data if available
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
            this.dom.setText('tokenReward', '- $BRO');
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
        // Show saved progress without auto-starting
        this.restoreProgressState(progress);
    }

    restoreProgressState(progress) {

        // Show saved progress without starting
        this.dom.show('miningDisplay');

        const miningDisplay = document.getElementById('miningDisplay');

        this.dom.setText('status', 'Stopped - Progress Saved');
        const status = this.dom.get('status');
        if (status) status.className = 'stat-value stopped';

        this.dom.setText('nonce', progress.nonce.toLocaleString());

        // Only update hash display if hash exists
        if (progress.hash) {
            this.updateHashDisplay('currentHash', progress.hash);
            this.dom.setText('currentLeadingZeros', this.miner.hashAnalyzer.countLeadingZeroBits(progress.hash));
        } else {
            this.updateHashDisplay('currentHash', 'Waiting to resume...');
            this.dom.setText('currentLeadingZeros', '0');
        }

        if (progress.bestHash) {
            this.updateHashDisplay('bestHash', progress.bestHash);
            this.dom.setText('bestNonce', progress.bestNonce.toLocaleString());
            this.dom.setText('bestLeadingZeros', progress.bestLeadingZeros);

            this.displayTokenReward(progress.bestNonce, progress.bestHash);
            
            // Update progress bar
            const progressPercent = Math.min((progress.bestLeadingZeros / 20) * 100, 95);
            const progressFill = this.dom.get('progressFill');
            if (progressFill) progressFill.style.width = progressPercent + '%';
        } else {
            this.updateHashDisplay('bestHash', 'No best hash yet...');
            this.dom.setText('bestNonce', '0');
            this.dom.setText('bestLeadingZeros', '0');
            this.dom.setText('tokenReward', '- $BRO');
            this.dom.setText('proofOfWork', '-');
            
            const progressFill = this.dom.get('progressFill');
            if (progressFill) progressFill.style.width = '0%';
            this.dom.setText('tokenReward', '-');
            this.dom.setText('proofOfWork', '-');
        }

        const bestLeadingZeros = progress.bestLeadingZeros || 0;
        const progressPercent = Math.min((bestLeadingZeros / 20) * 100, 95);
        const progressFill = this.dom.get('progressFill');
        if (progressFill) progressFill.style.width = progressPercent + '%';

        const rewardDisplay = document.getElementById('rewardDisplay');
        if (rewardDisplay) {
            rewardDisplay.style.display = 'block';
        }

        const elementsToCheck = [
            'miningDisplay', 'nonce', 'currentHash', 'currentLeadingZeros',
            'bestHash', 'bestNonce', 'bestLeadingZeros', 'status',
            'tokenReward', 'proofOfWork', 'rewardDisplay'
        ];

        elementsToCheck.forEach(elementId => {
            document.getElementById(elementId);
        });

        const startMining = this.dom.get('startMining');
        const stopMining = this.dom.get('stopMining');
        if (startMining) startMining.style.display = 'inline-block';
        if (stopMining) stopMining.style.display = 'none';

        this.dom.hide('successMessage');
        
        this.updateButtonText();
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
        this.setupMiningModeSelector();
        this.setupAppStateListeners();
    }

    setupAppStateListeners() {
        // Listen for transaction creation to disable mining button
        this.appState.on('transactionCreated', (transaction) => {
            console.log('[MiningManager] Transaction created, disabling mining button');
            this.updateButtonText(); // This will disable the button since this.appState.transaction now exists
        });
    }

    setupMiningModeSelector() {
        const modeBoxes = document.querySelectorAll('.mining-mode-box');
        if (modeBoxes.length === 0 || !this.miner) return;

        const activeBox = document.querySelector('.mining-mode-box.active');
        if (activeBox) {
            this.miner.mode = activeBox.dataset.mode;
        }

        modeBoxes.forEach(box => {
            box.addEventListener('click', () => {
                modeBoxes.forEach(b => b.classList.remove('active'));
                
                box.classList.add('active');
                
                const mode = box.dataset.mode;
                this.miner.mode = mode;
                
                console.log(`Mining mode switched to: ${mode}`);
            });
        });
    }

    setupStartMiningButton() {
        const startMining = this.dom.get('startMining');
        if (startMining) {
            startMining.addEventListener('click', async () => {
                const miningResult = this.miner.loadMiningResult();
                const miningProgress = this.miner.loadMiningProgress();
                const shouldResume = miningProgress && !miningResult;

                this.dom.show('miningDisplay');
                startMining.style.display = 'none';
                
                const stopMining = this.dom.get('stopMining');
                if (stopMining) {
                    stopMining.style.display = 'inline-block';
                }

                if (shouldResume) {
                    this.dom.setText('status', 'Resuming...');
                    const status = this.dom.get('status');
                    if (status) status.className = 'stat-value mining';

                    this.dom.setText('nonce', miningProgress.nonce.toLocaleString());
                    if (miningProgress.hash) {
                        this.updateHashDisplay('currentHash', miningProgress.hash);
                        this.dom.setText('currentLeadingZeros', this.miner.hashAnalyzer.countLeadingZeroBits(miningProgress.hash));
                    } else {
                        this.updateHashDisplay('currentHash', 'Resuming...');
                        this.dom.setText('currentLeadingZeros', '0');
                    }

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
                    // Start fresh mining
                    this.dom.setText('status', 'Mining...');
                    const status = this.dom.get('status');
                    if (status) status.className = 'stat-value mining';
                    this.dom.setText('nonce', '0');
                    this.updateHashDisplay('currentHash', 'Calculating...');
                    this.dom.setText('currentLeadingZeros', '0');
                    this.updateHashDisplay('bestHash', 'Searching for best hash...');
                    this.dom.setText('bestNonce', '0');
                    this.dom.setText('bestLeadingZeros', '0');

                    this.dom.setText('tokenReward', '-');
                    this.dom.setText('proofOfWork', '-');
                }

                const utxo = this.appState.utxo;
                
                // ATOMIC: Disable Step 3 when mining actually starts
                console.log('[MiningManager] Starting PoW - Disabling Step 3');
                this.appState.disableStep3();
                
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

                const miningProgress = this.miner.loadMiningProgress();
                const hasValidResults = miningProgress && miningProgress.bestHash && miningProgress.bestNonce > 0;
                
                if (hasValidResults) {
                    console.log('[MiningManager] Stop Mining - Enabling Step 3 with valid results');
                    this.appState.enableStep3();
                }

                this.updateButtonText();
            });
        }
    }

    updateMiningProgress(progress) {
        // Use calculated values from miner
        const currentLeadingZeros = progress.leadingZeroBits;
        const bestLeadingZeros = progress.bestLeadingZeros;

        this.dom.setText('nonce', progress.nonce.toLocaleString());
        this.dom.setText('currentLeadingZeros', currentLeadingZeros);

        this.updateHashDisplay('currentHash', progress.hash);

        this.dom.setText('bestNonce', progress.bestHash ? progress.bestNonce.toLocaleString() : '-');
        this.dom.setText('bestLeadingZeros', bestLeadingZeros);

        if (progress.isNewBest && progress.bestHash) {
            this.updateHashDisplay('bestHash', progress.bestHash, true);

            const bestHashElement = this.dom.get('bestHash');
            if (bestHashElement) {
                bestHashElement.className = 'hash-value best';
            }
        } else if (progress.bestHash) {
            this.updateHashDisplay('bestHash', progress.bestHash);
        } else {
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

        this.dom.show('successMessage');

        const startMining = this.dom.get('startMining');
        const stopMining = this.dom.get('stopMining');
        if (startMining) startMining.style.display = 'inline-block';
        if (stopMining) stopMining.style.display = 'none';

        this.updateButtonText();

        this.appState.completeMining(result);
    }

    displayTokenReward(nonce, hash) {
        try {
            const rewardInfo = calculateRewardInfo(nonce, hash);
            this.dom.setText('tokenReward', rewardInfo.formattedAmount);
            this.dom.setText('proofOfWork', `${rewardInfo.leadingZeros} leading zeros`);
        } catch (error) {
            console.error('Error calculating token reward:', error);
        }
    }

    updateButtonText() {
        const startMining = this.dom.get('startMining');
        const stopMining = this.dom.get('stopMining');
        if (!startMining) return;

        const buttonSpan = startMining.querySelector('span');
        if (!buttonSpan) return;

        if (this.appState.transaction) {
            buttonSpan.textContent = 'Mining Disabled';
            startMining.disabled = true;
            startMining.classList.add('disabled');
            startMining.style.pointerEvents = 'none';
            startMining.style.opacity = '0.5';
            if (stopMining) {
                stopMining.style.display = 'none';
            }
            return;
        }

        const hasSavedProgress = this.miner && this.miner.loadMiningProgress();
        const miningProgress = hasSavedProgress ? this.miner.loadMiningProgress() : null;
        const hasValidResults = miningProgress && miningProgress.bestHash && miningProgress.bestNonce > 0;
        
        if (this.miner && this.miner.isRunning) {
            buttonSpan.textContent = 'Mining...';
            startMining.style.display = 'none';
            
            if (stopMining) {
                stopMining.style.display = 'inline-block';
                const stopSpan = stopMining.querySelector('span');
                if (stopSpan && hasValidResults) {
                    stopSpan.textContent = 'Stop Mining and Claim Tokens';
                } else if (stopSpan) {
                    stopSpan.textContent = 'Stop Mining';
                }
            }
            return;
        }
        
        if (stopMining) {
            stopMining.style.display = 'none';
        }
        startMining.style.display = 'inline-block';

        if (hasValidResults) {
            buttonSpan.textContent = 'Continue Mining';
        } else if (hasSavedProgress) {
            buttonSpan.textContent = 'Continue Mining';
        } else {
            buttonSpan.textContent = 'Start Mining';
        }

        const canMine = this.appState.canStartMining();
        if (canMine) {
            startMining.disabled = false;
            startMining.classList.remove('disabled');
            startMining.style.pointerEvents = '';
            startMining.style.opacity = '';
        } else {
            startMining.disabled = true;
            startMining.classList.add('disabled');
            startMining.style.pointerEvents = 'none';
            startMining.style.opacity = '0.5';
        }
    }
}
