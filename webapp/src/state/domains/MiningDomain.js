// Mining domain - manages all mining-related state and logic
export class MiningDomain {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.data = {
            result: null,
            progress: null,
            isRunning: false,
            mode: 'cpu'
        };
    }

    // Mining result getters/setters
    get miningResult() { 
        return this.data.result; 
    }
    
    set miningResult(value) { 
        this.data.result = value;
        if (value) {
            this.eventBus.emit('miningCompleted', value);
        }
    }

    // Mining progress getters/setters
    get miningProgress() { 
        return this.data.progress; 
    }
    
    set miningProgress(value) { 
        this.data.progress = value;
        // Don't emit event for every progress update to avoid spam
    }

    // Mining state getters/setters
    get isRunning() { 
        return this.data.isRunning; 
    }
    
    set isRunning(value) { 
        this.data.isRunning = value;
    }

    get mode() { 
        return this.data.mode; 
    }
    
    set mode(value) { 
        this.data.mode = value;
    }

    // Start mining
    startMining(mode = 'cpu') {
        this.mode = mode;
        this.isRunning = true;
        this.eventBus.emit('miningStarted', { mode });
        console.log(`[MiningDomain] Mining started in ${mode} mode`);
    }

    // Stop mining
    stopMining() {
        this.isRunning = false;
        // Note: miningStopped event is emitted by MiningManager to avoid duplicates
        console.log('[MiningDomain] Mining stopped');
    }

    // Complete mining
    completeMining(result) {
        this.miningResult = result;
        this.stopMining();
        console.log('[MiningDomain] Mining completed with result:', result.txid);
    }

    // Calculate mining reward
    getMiningReward() {
        // Only calculate reward if we have a completed miningResult
        if (this.miningResult && this.miningResult.bestHash && this.miningResult.bestNonce) {
            try {
                if (window.calculateRewardInfo) {
                    const rewardInfo = window.calculateRewardInfo(this.miningResult.bestNonce, this.miningResult.bestHash);
                    return Number(rewardInfo.rawAmount);
                }
            } catch (error) {
                console.error('[MiningDomain] Error calculating reward:', error);
            }
        }
        return 0;
    }

    // Validation methods
    hasMiningResult() {
        return !!this.data.result;
    }

    hasMiningProgress() {
        return !!this.data.progress;
    }

    canAdvanceToNext() {
        const progress = this.miningProgress;
        return !!(progress && progress.bestHash && progress.bestNonce > 0);
    }

    // Check if mining is active
    isMiningActive() {
        if (!window.BitcoinMiner) return false;
        try {
            const miner = new window.BitcoinMiner();
            return miner.isRunning || false;
        } catch (error) {
            return false;
        }
    }

    // Internal method - ONLY called by reset system
    _resetState() {
        this.data = {
            result: null,
            progress: null,
            isRunning: false,
            mode: 'cpu'
        };
        console.log('[MiningDomain] State reset by reset system');
    }

    // Get domain state
    getState() {
        return {
            hasMiningResult: this.hasMiningResult(),
            hasMiningProgress: this.hasMiningProgress(),
            isRunning: this.data.isRunning,
            mode: this.data.mode,
            canAdvanceToNext: this.canAdvanceToNext(),
            isMiningActive: this.isMiningActive(),
            miningResult: this.data.result,
            miningProgress: this.data.progress,
            miningReward: this.getMiningReward()
        };
    }
}
