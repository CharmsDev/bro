// Mining persistence utilities for Storage system operations

export class MiningPersistence {
    constructor() {
        // No longer needed - using Storage system
    }

    // Save mining progress to Storage system
    async saveProgress(state) {
        try {
            const { Storage } = await import('../state/storage/Storage.js');
            
            const progressData = {
                currentNonce: state.currentNonce,
                currentHash: state.currentHash,
                bestHash: state.bestHash,
                bestNonce: state.bestNonce,
                bestLeadingZeros: state.bestLeadingZeros,
                challenge: state.challenge,
                timestamp: Date.now()
            };
            
            Storage.updateStep(2, {
                data: {
                    miningProgress: progressData,
                    isRunning: true,
                    mode: state.mode || 'cpu'
                }
            });
            
            console.log('[MiningPersistence] Progress saved to Storage system:', progressData);
        } catch (error) {
            console.warn('[MiningPersistence] Error saving progress:', error);
        }
    }

    // Load mining progress from Storage system
    async loadProgress() {
        try {
            const { Storage } = await import('../state/storage/Storage.js');
            const state = Storage.getState();
            
            const progressData = state.steps?.step2?.data?.miningProgress;
            console.log('[MiningPersistence] ✅ Loading progress from Storage system - found data:', !!progressData);
            
            if (progressData) {
                console.log('[MiningPersistence] ✅ Loaded nonce:', progressData.currentNonce, 'challenge:', progressData.challenge);
                return {
                    nonce: progressData.currentNonce || 0,
                    hash: progressData.currentHash || '',
                    bestHash: progressData.bestHash || '',
                    bestNonce: typeof progressData.bestNonce === 'string' ? Number(progressData.bestNonce) : (progressData.bestNonce || 0),
                    bestLeadingZeros: progressData.bestLeadingZeros || 0,
                    challenge: progressData.challenge || '',
                    timestamp: progressData.timestamp
                };
            }
        } catch (error) {
            console.error('[MiningPersistence] Error loading mining progress:', error);
        }
        return null;
    }

    // Clear mining progress from Storage system
    async clearProgress() {
        try {
            const { Storage } = await import('../state/storage/Storage.js');
            
            Storage.updateStep(2, {
                data: {
                    miningProgress: null,
                    isRunning: false,
                    mode: 'cpu'
                }
            });
            
            console.log('[MiningPersistence] ✅ Progress cleared from Storage system');
        } catch (error) {
            console.warn('[MiningPersistence] Error clearing progress:', error);
        }
    }

    // Save mining result to Storage system
    async saveResult(result, challengeInfo) {
        try {
            const { Storage } = await import('../state/storage/Storage.js');
            
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
            
            Storage.updateStep(2, {
                data: {
                    miningResult: resultData,
                    miningProgress: null, // Clear progress when result is saved
                    isRunning: false,
                    mode: 'cpu'
                }
            });
            
            console.log('[MiningPersistence] ✅ Result saved to Storage system:', resultData);
        } catch (error) {
            console.warn('[MiningPersistence] Error saving result:', error);
        }
    }

    // Load mining result from Storage system
    async loadResult() {
        try {
            const { Storage } = await import('../state/storage/Storage.js');
            const state = Storage.getState();
            
            const resultData = state.steps?.step2?.data?.miningResult;
            if (resultData && resultData.completed) {
                console.log('[MiningPersistence] ✅ Result loaded from Storage system:', resultData);
                return resultData;
            }
        } catch (error) {
            console.error('[MiningPersistence] Error loading mining result:', error);
        }
        return null;
    }

    // Clear mining result from Storage system
    async clearResult() {
        try {
            const { Storage } = await import('../state/storage/Storage.js');
            
            Storage.updateStep(2, {
                data: {
                    miningResult: null,
                    isRunning: false,
                    mode: 'cpu'
                }
            });
            
            console.log('[MiningPersistence] ✅ Result cleared from Storage system');
        } catch (error) {
            console.warn('[MiningPersistence] Error clearing result:', error);
        }
    }
}
