// Mining persistence utilities for localStorage operations

export class MiningPersistence {
    constructor() {
        this.PROGRESS_KEY = 'miningProgress';
        this.RESULT_KEY = 'miningResult';
    }

    // Save mining progress to localStorage
    saveProgress(state) {
        const progressData = {
            nonce: state.currentNonce,
            hash: state.currentHash,
            bestHash: state.bestHash,
            bestNonce: typeof state.bestNonce === 'bigint' ? state.bestNonce.toString() : state.bestNonce,
            bestLeadingZeros: state.bestLeadingZeros,
            challenge: state.challenge,
            timestamp: Date.now()
        };
        localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progressData));
    }

    // Load mining progress from localStorage
    loadProgress() {
        const saved = localStorage.getItem(this.PROGRESS_KEY);
        if (saved) {
            try {
                const progressData = JSON.parse(saved);
                return {
                    nonce: progressData.nonce || 0,
                    hash: progressData.hash || '',
                    bestHash: progressData.bestHash || '',
                    bestNonce: typeof progressData.bestNonce === 'string' ? Number(progressData.bestNonce) : (progressData.bestNonce || 0),
                    bestLeadingZeros: progressData.bestLeadingZeros || 0,
                    challenge: progressData.challenge || '',
                    timestamp: progressData.timestamp
                };
            } catch (error) {
                console.error('Error loading mining progress:', error);
                this.clearProgress();
            }
        }
        return null;
    }

    // Clear mining progress
    clearProgress() {
        localStorage.removeItem(this.PROGRESS_KEY);
    }

    // Save mining result to localStorage
    saveResult(result, challengeInfo) {
        const resultData = {
            nonce: typeof result.nonce === 'bigint' ? result.nonce.toString() : result.nonce,
            hash: result.hash,
            bestHash: result.bestHash,
            bestNonce: typeof result.bestNonce === 'bigint' ? result.bestNonce.toString() : result.bestNonce,
            bestLeadingZeros: result.bestLeadingZeros,
            challenge: challengeInfo.challenge,
            challengeTxid: challengeInfo.challengeTxid,
            challengeVout: challengeInfo.challengeVout,
            timestamp: Date.now(),
            completed: true
        };
        localStorage.setItem(this.RESULT_KEY, JSON.stringify(resultData));
        this.clearProgress();
    }

    // Load mining result from localStorage
    loadResult() {
        const saved = localStorage.getItem(this.RESULT_KEY);
        if (saved) {
            try {
                const resultData = JSON.parse(saved);
                if (resultData.completed) {
                    return resultData;
                }
            } catch (error) {
                console.error('Error loading mining result:', error);
                this.clearResult();
            }
        }
        return null;
    }

    // Clear mining result
    clearResult() {
        localStorage.removeItem(this.RESULT_KEY);
    }
}
