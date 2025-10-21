// Mining slice for Zustand store
import MiningModule from '../../modules/mining/MiningModule.js';

const DEBUG = false;
export const createMiningSlice = (set, get) => ({
  // Mining state
  mining: {
    isActive: false,
    mode: 'cpu', // 'cpu' or 'gpu'
    
    // Current mining progress
    currentNonce: 0,
    currentHash: '',
    currentLeadingZeros: 0,
    
    // Best result found
    bestHash: '',
    bestNonce: 0,
    bestLeadingZeros: 0,
    
    // Challenge info
    challenge: '',
    challengeTxid: '',
    challengeVout: 0,
    
    // Statistics
    hashRate: 0,
    elapsed: 0,
    startTime: null,
    
    // Reward info
    rewardInfo: null,
    
    // Result
    result: null,
    hasResult: false,
    
    // Status
    status: 'idle', // 'idle', 'starting', 'mining', 'stopping', 'stopped', 'error'
    statusMessage: '',
    error: null
  },

  // Mining actions
  setMiningMode: (mode) => {
    set((state) => ({
      mining: { ...state.mining, mode }
    }));
  },

  setMiningActive: (isActive) => {
    set((state) => ({
      mining: { 
        ...state.mining, 
        isActive,
        startTime: isActive ? Date.now() : state.mining.startTime
      }
    }));
  },

  updateMiningProgress: (progress) => {
    set((state) => ({
      mining: {
        ...state.mining,
        currentNonce: progress.currentNonce || state.mining.currentNonce,
        currentHash: progress.currentHash || state.mining.currentHash,
        currentLeadingZeros: progress.currentLeadingZeros || state.mining.currentLeadingZeros,
        bestHash: progress.bestHash || state.mining.bestHash,
        bestNonce: progress.bestNonce || state.mining.bestNonce,
        bestLeadingZeros: progress.bestLeadingZeros || state.mining.bestLeadingZeros,
        hashRate: progress.hashRate || state.mining.hashRate,
        elapsed: progress.elapsed || state.mining.elapsed
      }
    }));
  },

  updateBestHash: (bestHashData) => {
    const nonce = typeof bestHashData.nonce === 'bigint' ? Number(bestHashData.nonce) : bestHashData.nonce;
    // Convert BigInt in rewardInfo to string for JSON serialization
    const rewardInfo = bestHashData.rewardInfo ? {
      ...bestHashData.rewardInfo,
      rawAmount: typeof bestHashData.rewardInfo.rawAmount === 'bigint' 
        ? bestHashData.rewardInfo.rawAmount.toString() 
        : bestHashData.rewardInfo.rawAmount
    } : null;
    
    set((state) => ({
      mining: {
        ...state.mining,
        bestHash: bestHashData.hash,
        bestNonce: nonce,
        bestLeadingZeros: bestHashData.leadingZeros,
        rewardInfo: rewardInfo,
        hasResult: true,
        result: {
          hash: bestHashData.hash,
          nonce: nonce,
          leadingZeros: bestHashData.leadingZeros,
          rewardInfo: rewardInfo
        }
      }
    }));
  },

  setMiningChallenge: (utxo) => {
    const challenge = `${utxo.txid}:${utxo.vout}`;
    set((state) => ({
      mining: {
        ...state.mining,
        challenge,
        challengeTxid: utxo.txid,
        challengeVout: utxo.vout
      }
    }));
    
    // Persist challenge to localStorage
    MiningModule.saveChallenge(utxo);
  },

  setMiningStatus: (status, message = '', error = null) => {
    set((state) => ({
      mining: {
        ...state.mining,
        status,
        statusMessage: message,
        error
      }
    }));
  },

  setMiningResult: (result) => {
    set((state) => ({
      mining: {
        ...state.mining,
        result,
        hasResult: !!result,
        isActive: false,
        status: 'stopped'
      }
    }));
  },

  clearMiningResult: () => {
    set((state) => ({
      mining: {
        ...state.mining,
        result: null,
        hasResult: false,
        bestHash: '',
        bestNonce: 0,
        bestLeadingZeros: 0,
        currentNonce: 0,
        currentHash: '',
        currentLeadingZeros: 0,
        rewardInfo: null,
        hashRate: 0,
        elapsed: 0,
        status: 'idle',
        statusMessage: '',
        error: null
      }
    }));
    
    // Clear data via MiningModule
    MiningModule.clear();
  },

  // Load mining data from CentralStorage via MiningModule
  loadMiningData: () => {
    try {
      const miningData = MiningModule.load();
      
      if (!miningData) {
        return false;
      }
      
      // Load challenge if available
      if (miningData.challenge || miningData.challengeTxid) {
        const challenge = miningData.challenge || 
          (miningData.challengeTxid && miningData.challengeVout !== undefined 
            ? `${miningData.challengeTxid}:${miningData.challengeVout}` 
            : null);
        
        if (challenge) {
          set(state => ({
            mining: {
              ...state.mining,
              challenge: challenge,
              challengeTxid: miningData.challengeTxid || '',
              challengeVout: miningData.challengeVout ?? 0
            }
          }));
        }
      }
      
      // Load progress if available
      if (miningData.progress) {
        set(state => ({
          mining: {
            ...state.mining,
            currentNonce: miningData.progress.currentNonce || state.mining.currentNonce || 0,
            hashRate: miningData.progress.hashRate || 0,
            totalHashes: miningData.progress.totalHashes || 0,
            elapsed: miningData.progress.elapsedTime || 0,
            mode: miningData.progress.mode || 'cpu'
          }
        }));
      }
      
      // Load result if available
      if (miningData.hasResult && miningData.result) {
        set(state => ({
          mining: {
            ...state.mining,
            bestHash: miningData.result.hash || '',
            bestNonce: miningData.result.nonce || 0,
            bestLeadingZeros: miningData.result.leadingZeros || 0,
            hasResult: true,
            result: miningData.result
          }
        }));
      }
      
      return true;
    } catch (error) {
      return false;
    }
  },

  getMiningStats: () => {
    const { mining } = get();
    return {
      isActive: mining.isActive,
      mode: mining.mode,
      currentNonce: mining.currentNonce,
      bestLeadingZeros: mining.bestLeadingZeros,
      hashRate: mining.hashRate,
      elapsed: mining.elapsed,
      hasResult: mining.hasResult,
      status: mining.status
    };
  },

  // Export all mining functions
  saveMiningData: () => {
    try {
      const { mining } = get();
      
      // Save mining progress using MiningModule
      MiningModule.saveProgress({
        currentNonce: mining.currentNonce || 0,
        hashRate: mining.hashRate,
        totalHashes: mining.totalHashes || 0,
        elapsedTime: mining.elapsed,
        isActive: mining.isActive,
        mode: mining.mode
      });
      
      // Save mining result if we have one
      if (mining.hasResult && mining.result) {
        const nonce = mining.bestNonce || mining.result?.nonce;
        MiningModule.saveResult({
          nonce: typeof nonce === 'bigint' ? nonce.toString() : String(nonce || 0),
          hash: mining.bestHash || mining.result?.hash || '',
          leadingZeros: mining.bestLeadingZeros || mining.result?.leadingZeros || 0,
          reward: mining.rewardInfo?.rawAmount || mining.rewardInfo?.reward || 0
        });
      }
      
    } catch (error) {
    }
  },

  isMiningReady: () => {
    const { mining, batch } = get();
    return batch?.selectedUtxos?.length > 0 && !mining.isActive;
  },

  canStartMining: () => {
    const { mining, batch } = get();
    return !mining.isActive && 
           batch?.fundingStatus === 'sufficient' && 
           batch?.selectedUtxos?.length > 0;
  },

  // Export setBestHash (alias for updateBestHash)
  setBestHash: (bestHashData) => {
    const nonce = typeof bestHashData.nonce === 'bigint' ? Number(bestHashData.nonce) : bestHashData.nonce;
    // Convert BigInt in rewardInfo to string for JSON serialization
    const rewardInfo = bestHashData.rewardInfo ? {
      ...bestHashData.rewardInfo,
      rawAmount: typeof bestHashData.rewardInfo.rawAmount === 'bigint' 
        ? bestHashData.rewardInfo.rawAmount.toString() 
        : bestHashData.rewardInfo.rawAmount
    } : null;
    
    set((state) => ({
      mining: {
        ...state.mining,
        bestHash: bestHashData.hash,
        bestNonce: nonce,
        bestLeadingZeros: bestHashData.leadingZeros,
        rewardInfo: rewardInfo,
        hasResult: true,
        result: {
          hash: bestHashData.hash,
          nonce: nonce,
          leadingZeros: bestHashData.leadingZeros,
          rewardInfo: rewardInfo
        }
      }
    }));
  }
});
