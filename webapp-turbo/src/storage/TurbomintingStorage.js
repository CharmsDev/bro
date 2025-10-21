/**
 * TurbomintingStorage - Turbominting-specific localStorage operations
 * Handles minting loop progress, funding transactions, and output tracking
 */

import CentralStorage from './CentralStorage.js';

export class TurbomintingStorage {
  /**
   * Save turbominting data (minting progress, outputs, etc.)
   */
  static save(turbomintingData) {
    CentralStorage.saveTurbominting(turbomintingData);
  }

  /**
   * Load turbominting data
   */
  static load() {
    return CentralStorage.getTurbominting();
  }

  /**
   * @deprecated Use TurbomintingModule.setFundingBroadcast() instead
   * This saves to bro_app.funding (deprecated location)
   * All funding data should be in bro_app.turbominting
   */
  static saveFunding(fundingData) {
    CentralStorage.saveFunding(fundingData);
  }

  /**
   * @deprecated Use TurbomintingModule.getFundingTransaction() instead
   * This loads from bro_app.funding (deprecated location)
   * All funding data should be in bro_app.turbominting
   */
  static loadFunding() {
    return CentralStorage.getFunding();
  }

  /**
   * Clear turbominting data
   */
  static clear() {
    CentralStorage.clear('turbominting');
  }

  /**
   * Clear funding data
   */
  static clearFunding() {
    CentralStorage.clear('funding');
  }

  /**
   * Clear all turbominting-related data
   */
  static clearAll() {
    this.clear();
    this.clearFunding();
  }

  /**
   * Check if turbominting data exists
   */
  static exists() {
    return CentralStorage.getTurbominting() !== null;
  }

  /**
   * Check if funding transaction exists
   */
  static hasFunding() {
    return CentralStorage.getFunding() !== null;
  }

  /**
   * Get turbominting info
   */
  static getInfo() {
    const data = this.load();
    if (!data) return null;

    return {
      numberOfOutputs: data.numberOfOutputs,
      completedOutputs: data.completedOutputs || 0,
      currentOutputIndex: data.currentOutputIndex || 0,
      status: data.status,
      timestamp: data.timestamp
    };
  }

  /**
   * Get funding transaction info
   */
  static getFundingInfo() {
    const funding = this.loadFunding();
    if (!funding) return null;

    return {
      txid: funding.txid,
      inputsCount: funding.inputUtxos?.length || 0,
      outputsCount: funding.outputs?.length || 0,
      totalValue: funding.totalInputValue || 0,
      fee: funding.estimatedFee || 0,
      timestamp: funding.timestamp
    };
  }
}
