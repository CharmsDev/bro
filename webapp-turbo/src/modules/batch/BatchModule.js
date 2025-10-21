/**
 * BatchModule - Encapsulates batch configuration state and persistence
 */

import CentralStorage from '../../storage/CentralStorage.js';

class BatchModule {
  /**
   * Save batch configuration
   */
  static save(batchData) {
    try {
      const dataToSave = {
        quantity: batchData.quantity,
        utxos: batchData.utxos || [],
        selectedUtxos: batchData.selectedUtxos || [],
        requiredFunds: batchData.requiredFunds,
        availableFunds: batchData.availableFunds,
        fundingStatus: batchData.fundingStatus,
        timestamp: Date.now()
      };
      
      CentralStorage.set('batch', dataToSave);
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Load batch configuration
   */
  static load() {
    try {
      const data = CentralStorage.get('batch');
      return data || null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Clear batch data
   */
  static clear() {
    try {
      CentralStorage.clear('batch');
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default BatchModule;
