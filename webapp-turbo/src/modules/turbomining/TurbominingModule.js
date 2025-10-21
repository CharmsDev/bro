/**
 * TurbominingModule - Manages turbomining transaction state persistence and hydration
 */

import CentralStorage from '../../storage/CentralStorage.js';

class TurbominingModule {
  static save(turbominingData) {
    try {
      const existing = CentralStorage.getTurbomining() || {};
      const locked = !!(turbominingData.miningTxid || existing.miningTxid);
      
      const dataToSave = {
        ...existing,
        ...turbominingData,
        locked: locked,
        timestamp: Date.now()
      };
      
      CentralStorage.saveTurbomining(dataToSave);
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  static update(updates) {
    try {
      const existing = this.load() || {};
      this.save({ ...existing, ...updates });
      return true;
    } catch (error) {
      return false;
    }
  }
  static load() {
    try {
      const turbominingData = CentralStorage.getTurbomining();
      
      if (!turbominingData) {
        return null;
      }
      
      return turbominingData;
    } catch (error) {
      return null;
    }
  }
  
  static hydrate(store) {
    try {
      const turbominingData = this.load();
      
      if (turbominingData && store) {
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
  
  static clear() {
    try {
      CentralStorage.clear('turbomining');
      return true;
    } catch (error) {
      return false;
    }
  }
  
  static isLocked() {
    const data = this.load();
    return data?.miningTxid !== undefined && data?.miningTxid !== null;
  }
  
  static isConfirmed() {
    const data = this.load();
    return data?.miningTxConfirmed === true;
  }
  
  static getLockStatus() {
    const data = this.load();
    
    if (!data) {
      return { isLocked: false, reason: null };
    }
    
    if (data.miningTxid) {
      return {
        isLocked: true,
        reason: 'broadcast',
        message: 'Transaction broadcast - selection locked',
        data
      };
    }
    
    return { isLocked: false, reason: null };
  }
}

export default TurbominingModule;
