/**
 * MiningModule - Manages mining state persistence and hydration
 */

import CentralStorage from '../../storage/CentralStorage.js';

class MiningModule {
  static saveProgress(progressData) {
    try {
      const existing = CentralStorage.getMining() || {};
      
      CentralStorage.saveMining({
        ...existing,
        progress: {
          currentNonce: progressData.currentNonce,
          hashRate: progressData.hashRate,
          totalHashes: progressData.totalHashes,
          elapsedTime: progressData.elapsedTime,
          isActive: progressData.isActive,
          mode: progressData.mode,
          timestamp: Date.now()
        }
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  static saveResult(resultData) {
    try {
      const existing = CentralStorage.getMining() || {};
      
      CentralStorage.saveMining({
        ...existing,
        result: {
          nonce: resultData.nonce,
          hash: resultData.hash,
          leadingZeros: resultData.leadingZeros,
          reward: resultData.reward,
          timestamp: Date.now()
        },
        hasResult: true,
        locked: true
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  static saveChallenge(challengeData) {
    try {
      const existing = CentralStorage.getMining() || {};
      
      CentralStorage.saveMining({
        ...existing,
        challenge: `${challengeData.txid}:${challengeData.vout}`,
        challengeTxid: challengeData.txid,
        challengeVout: challengeData.vout,
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  static load() {
    try {
      const miningData = CentralStorage.getMining();
      
      if (!miningData) {
        return null;
      }
      
      return miningData;
    } catch (error) {
      return null;
    }
  }
  
  static hydrate(store) {
    try {
      const miningData = this.load();
      
      if (miningData && store) {
        // Restore challenge if available
        if (miningData.challenge || miningData.challengeTxid) {
          const challenge = miningData.challenge || 
            (miningData.challengeTxid && miningData.challengeVout !== undefined 
              ? `${miningData.challengeTxid}:${miningData.challengeVout}` 
              : null);
          
          if (challenge) {
            store.setMiningChallenge({
              txid: miningData.challengeTxid,
              vout: miningData.challengeVout
            });
          }
        }
        
        if (miningData.progress) {
          store.updateMiningProgress({
            currentNonce: miningData.progress.currentNonce || 0,
            hashRate: miningData.progress.hashRate || 0,
            totalHashes: miningData.progress.totalHashes || 0,
            elapsed: miningData.progress.elapsedTime || 0
          });
        }
        
        if (miningData.hasResult && miningData.result) {
          store.updateBestHash({
            hash: miningData.result.hash,
            nonce: miningData.result.nonce,
            leadingZeros: miningData.result.leadingZeros,
            rewardInfo: miningData.result.rewardInfo || null
          });
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
  
  static clear() {
    try {
      CentralStorage.clear('mining');
      return true;
    } catch (error) {
      return false;
    }
  }
  
  static hasResult() {
    const miningData = CentralStorage.getMining();
    return miningData?.hasResult === true;
  }
  
  static isLocked() {
    try {
      const miningData = this.load();
      
      // Check if turbomining has been broadcast (step2Locked)
      const turbominingData = CentralStorage.getTurbomining();
      const turbominingBroadcast = turbominingData?.miningTxid !== undefined && turbominingData?.miningTxid !== null;
      const step2Locked = turbominingData?.step2Locked === true;
      
      // Mining is locked if:
      // 1. Has mining result AND
      // 2. Turbomining transaction has been broadcast (step2Locked or miningTxid exists)
      return miningData?.hasResult === true && (step2Locked || turbominingBroadcast);
    } catch (error) {
      return false;
    }
  }
  
  static getLockStatus() {
    try {
      const miningData = this.load();
      const turbominingData = CentralStorage.getTurbomining();
      
      if (!miningData) {
        return { isLocked: false, reason: null };
      }
      
      // Check turbomining broadcast first
      if (turbominingData?.miningTxid || turbominingData?.step2Locked) {
        return {
          isLocked: true,
          reason: 'turbomining_broadcast',
          message: 'Turbomining transaction broadcast - mining locked',
          data: { 
            mining: miningData, 
            turbomining: turbominingData,
            miningTxid: turbominingData?.miningTxid 
          }
        };
      }
      
      return { isLocked: false, reason: null };
    } catch (error) {
      return { isLocked: false, reason: null, error: error.message };
    }
  }
}

export default MiningModule;
