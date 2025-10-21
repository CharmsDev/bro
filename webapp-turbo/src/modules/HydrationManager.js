/**
 * HydrationManager - Central coordinator for app state hydration
 * 
 * Coordinates hydration of all modules on app initialization in the correct order.
 * Ensures wallet data is loaded before mining, turbomining, and minting data.
 */

import WalletModule from './wallet/WalletModule.js';
import MiningModule from './mining/MiningModule.js';
import TurbominingModule from './turbomining/TurbominingModule.js';
import TurbomintingModule from './turbominting/TurbomintingModule.js';
import BatchModule from './batch/BatchModule.js';
import CentralStorage from '../storage/CentralStorage.js';

class HydrationManager {
  static DEBUG = false;
  
  static async hydrateAll(store) {
    
    const results = {
      wallet: false,
      batch: false,
      mining: false,
      turbomining: false,
      turbominting: false,
      steps: false
    };
    
    try {
      results.wallet = WalletModule.hydrate(store);
      results.batch = this.hydrateBatch(store);
      results.mining = MiningModule.hydrate(store);
      results.turbomining = TurbominingModule.hydrate(store);
      results.turbominting = TurbomintingModule.hydrate(store);
      results.steps = this.hydrateSteps(store);
      
      return results;
    } catch (error) {
      return results;
    }
  }
  
  static hydrateBatch(store) {
    try {
      const batchData = BatchModule.load();
      
      if (batchData && store.loadBatchData) {
        store.loadBatchData();
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
  
  static hydrateSteps(store) {
    try {
      const currentStep = CentralStorage.getCurrentStep();
      const completedSteps = CentralStorage.getCompletedSteps();
      
      if (store && currentStep) {
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
  
  static clearAll() {
    
    const results = {
      wallet: WalletModule.clear(),
      batch: BatchModule.clear(),
      mining: MiningModule.clear(),
      turbomining: TurbominingModule.clear(),
      turbominting: TurbomintingModule.clear()
    };
    
    CentralStorage.set('steps', { current: 1, completed: [] });
    
    return results;
  }
  
  static getStatus() {
    return {
      wallet: WalletModule.exists(),
      batch: BatchModule.load() !== null,
      mining: MiningModule.hasResult(),
      turbomining: TurbominingModule.isLocked(),
      turbominting: TurbomintingModule.load() !== null
    };
  }
  
  static debug() {
    // Debug method - logs removed for production
    return {
      wallet: WalletModule.load(),
      batch: BatchModule.load(),
      mining: MiningModule.load(),
      turbomining: TurbominingModule.load(),
      turbominting: TurbomintingModule.load(),
      steps: {
        current: CentralStorage.getCurrentStep(),
        completed: CentralStorage.getCompletedSteps()
      }
    };
  }
}

export default HydrationManager;
