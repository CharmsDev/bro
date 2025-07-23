// Mining Manager - handles mining operations and UI updates
export class MiningManager {
    constructor(domElements, stepController, appState, miner) {
        this.dom = domElements;
        this.stepController = stepController;
        this.appState = appState;
        this.miner = miner;
    }

    initialize() {
        this.setupEventListeners();
        this.checkExistingMiningState();

        // Only disable mining if no wallet exists
        if (!this.appState.canStartMining()) {
            this.stepController.initializeMiningStep();
        }
    }

    checkExistingMiningState() {
        if (!this.miner) return;

        // Check for completed mining result first
        const miningResult = this.miner.loadMiningResult();
        if (miningResult) {
            console.log('Found completed mining result, restoring state');
            this.restoreCompletedMining(miningResult);
            return;
        }

        // Check for mining progress
        const miningProgress = this.miner.loadMiningProgress();
        if (miningProgress) {
            console.log('Found mining progress, offering to resume');
            this.offerResumeOption(miningProgress);
        }
    }

    restoreCompletedMining(result) {
        // Show mining display
        this.dom.show('miningDisplay');

        // Update UI with completed state
        this.dom.setText('status', 'Success!');
        const status = this.dom.get('status');
        if (status) status.className = 'stat-value success';

        this.dom.setText('nonce', result.nonce.toLocaleString());
        this.dom.setText('currentHash', result.hash);

        const progressFill = this.dom.get('progressFill');
        if (progressFill) progressFill.style.width = '100%';

        // Show success message
        this.dom.setText('finalNonce', result.nonce.toLocaleString());
        this.dom.setText('finalHash', result.hash);
        this.dom.show('successMessage');

        // Complete mining in app state
        this.appState.completeMining(result);
    }

    offerResumeOption(progress) {
        const resumeMessage = `Found previous mining progress at nonce ${progress.nonce.toLocaleString()}. Would you like to resume?`;
        if (confirm(resumeMessage)) {
            this.resumeMining(progress);
        }
    }

    async resumeMining(progress) {
        // Show mining display
        this.dom.show('miningDisplay');

        // Update UI with current progress
        this.dom.setText('status', 'Resuming...');
        const status = this.dom.get('status');
        if (status) status.className = 'stat-value mining';

        this.dom.setText('nonce', progress.nonce.toLocaleString());
        this.dom.setText('currentHash', progress.hash);

        // Switch buttons
        const startMining = this.dom.get('startMining');
        const stopMining = this.dom.get('stopMining');
        if (startMining) startMining.style.display = 'none';
        if (stopMining) stopMining.style.display = 'inline-block';

        this.dom.hide('successMessage');

        // Resume mining
        await this.miner.startDemo(
            (progress) => this.updateMiningProgress(progress),
            (result) => this.completeMining(result),
            true // resumeFromSaved = true
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
                if (!this.miner || !this.appState.canStartMining()) {
                    alert('Mining not available or wallet not created');
                    return;
                }

                // Show mining display and switch buttons
                this.dom.show('miningDisplay');
                startMining.style.display = 'none';
                const stopMining = this.dom.get('stopMining');
                if (stopMining) stopMining.style.display = 'inline-block';
                this.dom.hide('successMessage');

                // Reset UI
                this.dom.setText('status', 'Mining...');
                const status = this.dom.get('status');
                if (status) status.className = 'stat-value mining';
                this.dom.setText('nonce', '0');
                this.dom.setText('currentHash', 'Calculating...');
                const progressFill = this.dom.get('progressFill');
                if (progressFill) progressFill.style.width = '0%';

                // Start mining with progress updates
                await this.miner.startDemo(
                    // Progress callback
                    (progress) => this.updateMiningProgress(progress),
                    // Completion callback
                    (result) => this.completeMining(result)
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

                // Reset buttons
                const startMining = this.dom.get('startMining');
                if (startMining) startMining.style.display = 'inline-block';
                stopMining.style.display = 'none';
            });
        }
    }

    updateMiningProgress(progress) {
        this.dom.setText('nonce', progress.nonce.toLocaleString());
        this.dom.setText('currentHash', progress.hash);

        // Animate progress bar based on leading zeros
        const leadingZeros = progress.hash.match(/^0*/)[0].length;
        const progressPercent = Math.min((leadingZeros / this.miner.difficulty) * 100, 95);
        const progressFill = this.dom.get('progressFill');
        if (progressFill) progressFill.style.width = progressPercent + '%';

        // Update hash color based on how close we are
        const currentHash = this.dom.get('currentHash');
        if (currentHash) {
            if (leadingZeros >= this.miner.difficulty) {
                currentHash.className = 'hash-value success';
            } else if (leadingZeros >= this.miner.difficulty - 1) {
                currentHash.className = 'hash-value close';
            } else {
                currentHash.className = 'hash-value';
            }
        }
    }

    completeMining(result) {
        this.dom.setText('status', 'Success!');
        const status = this.dom.get('status');
        if (status) status.className = 'stat-value success';
        const progressFill = this.dom.get('progressFill');
        if (progressFill) progressFill.style.width = '100%';

        // Show success message
        this.dom.setText('finalNonce', result.nonce.toLocaleString());
        this.dom.setText('finalHash', result.hash);
        this.dom.show('successMessage');

        // Reset buttons
        const startMining = this.dom.get('startMining');
        const stopMining = this.dom.get('stopMining');
        if (startMining) startMining.style.display = 'inline-block';
        if (stopMining) stopMining.style.display = 'none';

        // Complete mining in app state
        this.appState.completeMining(result);
    }
}
