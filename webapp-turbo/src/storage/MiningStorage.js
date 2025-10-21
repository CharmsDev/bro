/**
 * MiningStorage - Mining-specific localStorage operations
 * Handles both Mining (Step 3) and Turbomining (Step 4) data
 */

import CentralStorage from './CentralStorage.js';

export class MiningStorage {
  /**
   * Save mining result (nonce, hash, difficulty, etc.)
   */
  static saveMining(miningData) {
    CentralStorage.saveMining(miningData);
  }

  /**
   * Load mining result
   */
  static loadMining() {
    return CentralStorage.getMining();
  }

  /**
   * Save turbomining data (transaction, outputs, etc.)
   */
  static saveTurbomining(turbominingData) {
    CentralStorage.saveTurbomining(turbominingData);
  }

  /**
   * Load turbomining data
   */
  static loadTurbomining() {
    return CentralStorage.getTurbomining();
  }

  /**
   * Clear mining data
   */
  static clearMining() {
    CentralStorage.clear('mining');
  }

  /**
   * Clear turbomining data
   */
  static clearTurbomining() {
    CentralStorage.clear('turbomining');
  }

  /**
   * Clear all mining-related data
   */
  static clearAll() {
    this.clearMining();
    this.clearTurbomining();
  }

  /**
   * Check if mining result exists
   */
  static hasMining() {
    return CentralStorage.getMining() !== null;
  }

  /**
   * Check if turbomining data exists
   */
  static hasTurbomining() {
    return CentralStorage.getTurbomining() !== null;
  }

  /**
   * Get mining info
   */
  static getMiningInfo() {
    const mining = this.loadMining();
    if (!mining) return null;

    return {
      nonce: mining.nonce,
      hash: mining.hash,
      difficulty: mining.difficulty,
      leadingZeros: mining.leadingZeros,
      timestamp: mining.timestamp
    };
  }

  /**
   * Get turbomining info
   */
  static getTurbominingInfo() {
    const turbomining = this.loadTurbomining();
    if (!turbomining) return null;

    return {
      miningTxid: turbomining.miningTxid,
      numberOfOutputs: turbomining.numberOfOutputs,
      status: turbomining.status,
      timestamp: turbomining.timestamp
    };
  }
}
